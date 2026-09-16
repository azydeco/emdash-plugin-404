import type { KVAccess } from "emdash";
import { z } from "zod";

/** KV key under which the whole config document is stored. */
export const CONFIG_KEY = "config";

/** Current config document version. Bump when the shape changes and add a migration in `migrate()`. */
export const CONFIG_VERSION = 1;

/**
 * The core `MediaValue` shape. Known fields are typed; unknown provider
 * fields pass through so whatever the Media Library picker returns survives
 * a save/load round trip unchanged.
 */
const mediaValueSchema = z
	.object({
		provider: z.string().optional(),
		id: z.string(),
		src: z.string().optional(),
		previewUrl: z.string().optional(),
		filename: z.string().optional(),
		mimeType: z.string().optional(),
		width: z.number().optional(),
		height: z.number().optional(),
		focalX: z.number().optional(),
		focalY: z.number().optional(),
		blurhash: z.string().optional(),
		dominantColor: z.string().optional(),
		alt: z.string().optional(),
		meta: z.record(z.string(), z.unknown()).optional(),
	})
	.loose();

/** Field limits from spec section 4.1. Exported so the admin form can mirror them. */
export const LIMITS = {
	headline: 200,
	body: 5000,
	ctaLabel: 80,
	alt: 250,
} as const;

/**
 * A CTA href is either a site-relative path (`/…`, never `//…`) or an absolute
 * https URL. Anything else, including plain http and non-http schemes, is
 * rejected.
 */
export function isAllowedHref(href: string): boolean {
	if (href.startsWith("/")) return !href.startsWith("//");
	return isHttpsUrl(href);
}

function isHttpsUrl(value: string): boolean {
	try {
		return new URL(value).protocol === "https:";
	} catch {
		return false;
	}
}

const ctaFieldsSchema = z.object({
	label: z
		.string()
		.trim()
		.min(1, "CTA label is required when a CTA URL is set")
		.max(LIMITS.ctaLabel),
	href: z
		.string()
		.trim()
		.min(1, "CTA URL is required when a CTA label is set")
		.refine(isAllowedHref, "CTA URL must be a relative path or an https URL"),
});

function isBlankCta(value: unknown): boolean {
	if (typeof value !== "object" || value === null) return false;
	const { label, href } = value as { label?: unknown; href?: unknown };
	return isBlank(label) && isBlank(href);
}

function isBlank(value: unknown): boolean {
	return (
		value === undefined || value === null || (typeof value === "string" && value.trim() === "")
	);
}

/** A CTA with both fields blank is the same as no CTA: it normalises to `null`. */
const ctaSchema = z.preprocess(
	(value) => (isBlankCta(value) ? null : value),
	ctaFieldsSchema.nullable(),
);

const isoDatetime = z.iso.datetime();

const imageSchema = z
	.object({
		source: z.enum(["library", "external"]),
		value: mediaValueSchema,
		alt: z.string().trim().min(1, "Alt text is required when an image is set").max(LIMITS.alt),
		/** When the external URL was last verified as an image. External images only. */
		verifiedAt: isoDatetime.optional(),
	})
	.superRefine((image, ctx) => {
		if (image.source === "external") {
			if (image.value.provider !== "external" || typeof image.value.src !== "string") {
				ctx.addIssue({
					code: "custom",
					path: ["value"],
					message: 'An external image must be stored as { provider: "external", src }',
				});
			} else if (!isHttpsUrl(image.value.src)) {
				ctx.addIssue({
					code: "custom",
					path: ["value", "src"],
					message: "An external image URL must be https",
				});
			}
		} else if (image.verifiedAt !== undefined) {
			ctx.addIssue({
				code: "custom",
				path: ["verifiedAt"],
				message: "Only external images carry a verification timestamp",
			});
		}
	});

export const placementSchema = z.enum(["above", "below", "left", "right"]);

/** Fields an editor controls. Shared by the save input and the stored document. */
const editableFields = {
	enabled: z.boolean(),
	headline: z.string().max(LIMITS.headline),
	body: z.string().max(LIMITS.body),
	cta: ctaSchema,
	image: imageSchema.nullable(),
	placement: placementSchema,
};

type EditableFields = z.infer<z.ZodObject<typeof editableFields>>;

/**
 * Rules that span more than one field. Applied to both the save input and
 * the stored document so a document can never be stored in a state the
 * admin could not have submitted.
 */
function crossFieldRules(doc: EditableFields, ctx: z.RefinementCtx): void {
	if (doc.enabled && doc.headline.trim().length === 0) {
		ctx.addIssue({
			code: "custom",
			path: ["headline"],
			message: "Headline is required when the custom 404 page is enabled",
		});
	}
}

export const configDocumentSchema = z
	.object({
		version: z.literal(CONFIG_VERSION),
		...editableFields,
		updatedAt: isoDatetime,
	})
	.superRefine(crossFieldRules);

export type ConfigDocument = z.infer<typeof configDocumentSchema>;

/** What editors submit. The host stamps `version` and `updatedAt`; unknown keys are dropped. */
export const saveInputSchema = z.object(editableFields).superRefine(crossFieldRules);

export type SaveInput = z.infer<typeof saveInputSchema>;

/** `updatedAt` of a document that has never been saved. */
export const NEVER_SAVED = "1970-01-01T00:00:00.000Z";

/** The document served before an editor has saved anything: the plugin is off. */
export function defaultConfig(): ConfigDocument {
	return {
		version: CONFIG_VERSION,
		enabled: false,
		headline: "",
		body: "",
		cta: null,
		image: null,
		placement: "above",
		updatedAt: NEVER_SAVED,
	};
}

/**
 * Bring a stored document up to the current version. This is the seam for
 * future shape changes: add a `case` per old version that rewrites it to the
 * next one, and let it fall through to the current parse.
 */
function migrate(stored: unknown): ConfigDocument {
	const version =
		typeof stored === "object" && stored !== null && "version" in stored
			? stored.version
			: undefined;
	switch (version) {
		case 1:
			return configDocumentSchema.parse(stored);
		default:
			throw new Error(`Unsupported config document version: ${String(version)}`);
	}
}

/** Read the config document, returning the default when nothing is stored. */
export async function readConfig(kv: Pick<KVAccess, "get">): Promise<ConfigDocument> {
	const stored = await kv.get<unknown>(CONFIG_KEY);
	return stored === null ? defaultConfig() : migrate(stored);
}

/**
 * Store a submitted document. The envelope (`version`, `updatedAt`) is
 * stamped here, after the spread, so a client can never supply either.
 * `readConfig` is the only other place that knows the envelope.
 */
export async function writeConfig(
	kv: Pick<KVAccess, "set">,
	input: SaveInput,
	now: Date = new Date(),
): Promise<ConfigDocument> {
	const document: ConfigDocument = {
		...input,
		version: CONFIG_VERSION,
		updatedAt: now.toISOString(),
	};
	await kv.set(CONFIG_KEY, document);
	return document;
}
