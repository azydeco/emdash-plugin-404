/**
 * Pure form model for the admin page: how the config document maps onto
 * editable fields, which states are saveable, and how a picked media item
 * becomes a stored `MediaValue`. Nothing here touches React or the network,
 * so the rules the page enforces are unit tested without a browser.
 */
import type { MediaItem } from "@emdash-cms/admin";
import type { MediaValue } from "emdash";
import { z } from "zod";

import { placementSchema, saveInputSchema, type ConfigDocument, type SaveInput } from "../config";

/** What the Image source radio offers. `none` is the form's own; the document only knows the other two. */
export type ImageSource = z.infer<typeof imageSourceSchema>;
export type Placement = ConfigDocument["placement"];

/** One entry of a radio group or select. */
export type Option<T extends string> = { value: T; label: string };

/**
 * The image value as the document schema types it. It is core's
 * `MediaValue` plus passthrough of unknown provider fields; the assertion
 * below fails to compile if the two ever drift apart, since the public
 * `Image` component consumes the stored value as a `MediaValue`.
 */
export type StoredMediaValue = NonNullable<SaveInput["image"]>["value"];
type AssertAssignable<T extends U, U> = T;
type _StoredIsMediaValue = AssertAssignable<StoredMediaValue, MediaValue>;

/**
 * Everything the page edits. Flat and string-typed where the document is
 * nested and typed, because controls hold text; `prepareSave` does the
 * conversion in one place.
 */
export interface FormState {
	enabled: boolean;
	headline: string;
	body: string;
	ctaLabel: string;
	ctaHref: string;
	imageSource: ImageSource;
	/** The value chosen from the Media Library picker. Kept when the source switches so switching back restores it. */
	libraryImage: StoredMediaValue | null;
	externalUrl: string;
	/**
	 * The last successful `verify-url` result, tied to the exact URL it
	 * verified. Editing the URL leaves the stamp in place but makes it stale;
	 * `validateForm` compares the two.
	 */
	externalVerification: { url: string; verifiedAt: string } | null;
	alt: string;
	placement: Placement;
}

/** Every place an error can be shown. `form` is for errors with no field of their own. */
export type FormField =
	| "headline"
	| "body"
	| "ctaLabel"
	| "ctaHref"
	| "image"
	| "externalUrl"
	| "alt"
	| "placement"
	| "form";

/** At most one message per field; the first reason wins. */
export type FieldErrors = Partial<Record<FormField, string>>;

/** The form for the default document: disabled, blank, no image. */
export function emptyForm(): FormState {
	return {
		enabled: false,
		headline: "",
		body: "",
		ctaLabel: "",
		ctaHref: "",
		imageSource: "none",
		libraryImage: null,
		externalUrl: "",
		externalVerification: null,
		alt: "",
		placement: "above",
	};
}

/** The form an editor sees for a saved document. Inverse of `prepareSave` for valid documents. */
export function formFromConfig(doc: ConfigDocument): FormState {
	const form = emptyForm();
	form.enabled = doc.enabled;
	form.headline = doc.headline;
	form.body = doc.body;
	form.ctaLabel = doc.cta?.label ?? "";
	form.ctaHref = doc.cta?.href ?? "";
	form.placement = doc.placement;
	if (doc.image) {
		form.imageSource = doc.image.source;
		form.alt = doc.image.alt;
		if (doc.image.source === "library") {
			form.libraryImage = doc.image.value;
		} else {
			const url = doc.image.value.src ?? "";
			form.externalUrl = url;
			form.externalVerification = doc.image.verifiedAt
				? { url, verifiedAt: doc.image.verifiedAt }
				: null;
		}
	}
	return form;
}

/** The `MediaValue` stored for an external image. Same shape core's `normalizeMediaValue` produces for a bare URL. */
export function externalImageValue(url: string): StoredMediaValue {
	return { id: "", provider: "external", src: url };
}

/**
 * The document the form would submit, before validation. Blank CTA fields
 * become `null` here rather than relying on the schema's preprocess, so the
 * result is a plain `SaveInput` shape whatever the form holds.
 */
function candidateInput(form: FormState): SaveInput {
	const label = form.ctaLabel.trim();
	const href = form.ctaHref.trim();
	return {
		enabled: form.enabled,
		headline: form.headline,
		body: form.body,
		cta: label === "" && href === "" ? null : { label, href },
		image: candidateImage(form),
		placement: form.placement,
	};
}

function candidateImage(form: FormState): SaveInput["image"] {
	const alt = form.alt.trim();
	switch (form.imageSource) {
		case "none":
			return null;
		case "library":
			return form.libraryImage ? { source: "library", value: form.libraryImage, alt } : null;
		case "external": {
			const url = form.externalUrl.trim();
			return {
				source: "external",
				value: externalImageValue(url),
				alt,
				verifiedAt: currentVerification(form)?.verifiedAt,
			};
		}
		default:
			return form.imageSource satisfies never;
	}
}

/** The verification stamp, only if it is for the URL currently in the field. */
export function currentVerification(form: FormState): FormState["externalVerification"] {
	const stamp = form.externalVerification;
	return stamp && stamp.url === form.externalUrl.trim() ? stamp : null;
}

/**
 * Every reason the form cannot be saved, keyed by field. Empty means
 * saveable. The schema rules come from `saveInputSchema` itself so the
 * client can never accept what the route rejects; the rest are states the
 * schema cannot see (a library source with nothing chosen, an external URL
 * that has not been verified) because they never reach the route.
 */
export function validateForm(form: FormState): FieldErrors {
	const errors: FieldErrors = {};
	// Form-only rules first: their messages are more specific than the
	// schema's for the same field (a blank URL is "enter one", not "must be https").
	if (form.imageSource === "library" && !form.libraryImage) {
		errors.image = "Choose an image from the Media Library, or set the image source to none";
	}
	if (form.imageSource === "external") {
		const url = form.externalUrl.trim();
		if (url === "") {
			errors.externalUrl = "Enter an image URL";
		} else if (!currentVerification(form)) {
			errors.externalUrl = "Verify the URL before saving";
		}
	}
	const parsed = saveInputSchema.safeParse(candidateInput(form));
	if (!parsed.success) {
		for (const issue of parsed.error.issues) {
			errors[fieldForPath(issue.path)] ??= issue.message;
		}
	}
	return errors;
}

/** Either the body to send to `save`, or why the form cannot be saved. */
export type PrepareResult = { ok: true; input: SaveInput } | { ok: false; errors: FieldErrors };

/** Validate and, if saveable, produce the exact body for the `save` route. */
export function prepareSave(form: FormState): PrepareResult {
	const errors = validateForm(form);
	if (Object.keys(errors).length > 0) return { ok: false, errors };
	return { ok: true, input: saveInputSchema.parse(candidateInput(form)) };
}

/**
 * Map a schema issue path onto the form field that shows it. Paths come
 * from `saveInputSchema` (client side) and from the host's formatted error
 * (server side); both use the document's key names.
 */
export function fieldForPath(path: ReadonlyArray<PropertyKey>): FormField {
	const [head, second, third] = path.map(String);
	switch (head) {
		case "headline":
		case "body":
		case "placement":
			return head;
		case "cta":
			return second === "href" ? "ctaHref" : "ctaLabel";
		case "image":
			if (second === "alt") return "alt";
			if (second === "verifiedAt") return "externalUrl";
			if (second === "value" && third === "src") return "externalUrl";
			return "image";
		default:
			return "form";
	}
}

/**
 * Convert a picker `MediaItem` into the `MediaValue` the document stores.
 * Mirrors what core's image field stores so the public `Image` component
 * renders it identically: local media carry `meta.storageKey`; a URL typed
 * into the picker is `external` with `src`; any other provider keeps its
 * URL as `previewUrl` and its `meta` untouched.
 */
export function mediaItemToValue(item: MediaItem): StoredMediaValue {
	const provider = canonicalProvider(item.provider);
	const isLocal = provider === "local";
	const isExternal = provider === "external";
	return {
		id: item.id,
		provider,
		src: isExternal ? item.url : undefined,
		previewUrl: !isLocal && !isExternal ? item.url : undefined,
		alt: item.alt ?? "",
		width: item.width,
		height: item.height,
		focalX: item.focalX ?? undefined,
		focalY: item.focalY ?? undefined,
		filename: item.filename,
		mimeType: item.mimeType,
		blurhash: item.blurhash ?? metaString(item.meta, "blurhash"),
		dominantColor: item.dominantColor ?? metaString(item.meta, "dominantColor"),
		meta: isLocal ? { ...item.meta, storageKey: item.storageKey } : item.meta,
	};
}

/** The picker reports a typed-in URL as `external-url`; the stored value uses core's `external`. */
function canonicalProvider(provider: string | undefined): string {
	if (!provider) return "local";
	return provider === "external-url" ? "external" : provider;
}

function metaString(meta: Record<string, unknown> | undefined, key: string): string | undefined {
	const value = meta?.[key];
	return typeof value === "string" ? value : undefined;
}

/** Where the admin can load a preview of a stored value from. */
export function thumbnailUrl(value: MediaValue | StoredMediaValue): string | undefined {
	if (value.previewUrl) return value.previewUrl;
	if (value.src) return value.src;
	if (!value.provider || value.provider === "local") {
		const key = metaString(value.meta, "storageKey") ?? value.id;
		return `/_emdash/api/media/file/${encodeURIComponent(key)}`;
	}
	return undefined;
}

/** Choices for the Placement select, in display order. */
export const placementOptions: ReadonlyArray<Option<Placement>> = [
	{ value: "above", label: "Above the text" },
	{ value: "below", label: "Below the text" },
	{ value: "left", label: "Left of the text" },
	{ value: "right", label: "Right of the text" },
];

/** Choices for the Image source radio, in display order. */
export const imageSourceOptions: ReadonlyArray<Option<ImageSource>> = [
	{ value: "none", label: "No image" },
	{ value: "library", label: "Media Library" },
	{ value: "external", label: "External URL" },
];

/** Narrow a string from a DOM control. The placement one is the document's own enum. */
export const imageSourceSchema = z.enum(["none", "library", "external"]);
export { placementSchema };
