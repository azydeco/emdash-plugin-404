import { describe, expect, it } from "vitest";
import { configDocumentSchema, defaultConfig, readConfig, saveInputSchema } from "./config";
import { fakeKv } from "./test-support";

/** A fully populated, valid version 1 document. Each rule test perturbs one field. */
const validDocument = {
	version: 1,
	enabled: true,
	headline: "Page not found",
	body: "The page you asked for is not here.\n\nTry the homepage.",
	cta: { label: "Go home", href: "/" },
	image: {
		source: "library",
		value: { provider: "local", id: "01HX", src: "/_emdash/media/01HX.jpg" },
		alt: "A lost balloon",
	},
	placement: "above",
	updatedAt: "2026-09-14T10:00:00.000Z",
};

describe("configDocumentSchema", () => {
	it("accepts a fully populated valid document", () => {
		expect(configDocumentSchema.safeParse(validDocument).success).toBe(true);
	});
});

describe("configDocumentSchema headline rule", () => {
	it("rejects an enabled document with a blank headline", () => {
		const result = configDocumentSchema.safeParse({ ...validDocument, headline: "   " });
		expect(result.success).toBe(false);
	});

	it("accepts a disabled document with a blank headline", () => {
		const result = configDocumentSchema.safeParse({ ...validDocument, enabled: false, headline: "" });
		expect(result.success).toBe(true);
	});
});

describe("configDocumentSchema length limits", () => {
	it("accepts a headline of exactly 200 characters and rejects 201", () => {
		expect(configDocumentSchema.safeParse({ ...validDocument, headline: "h".repeat(200) }).success).toBe(true);
		expect(configDocumentSchema.safeParse({ ...validDocument, headline: "h".repeat(201) }).success).toBe(false);
	});

	it("accepts a body of exactly 5000 characters and rejects 5001", () => {
		expect(configDocumentSchema.safeParse({ ...validDocument, body: "b".repeat(5000) }).success).toBe(true);
		expect(configDocumentSchema.safeParse({ ...validDocument, body: "b".repeat(5001) }).success).toBe(false);
	});

	it("accepts a CTA label of exactly 80 characters and rejects 81", () => {
		const cta = (label: string) => ({ ...validDocument, cta: { label, href: "/" } });
		expect(configDocumentSchema.safeParse(cta("l".repeat(80))).success).toBe(true);
		expect(configDocumentSchema.safeParse(cta("l".repeat(81))).success).toBe(false);
	});

	it("accepts alt text of exactly 250 characters and rejects 251", () => {
		const image = (alt: string) => ({ ...validDocument, image: { ...validDocument.image, alt } });
		expect(configDocumentSchema.safeParse(image("a".repeat(250))).success).toBe(true);
		expect(configDocumentSchema.safeParse(image("a".repeat(251))).success).toBe(false);
	});
});

describe("configDocumentSchema CTA rules", () => {
	const withCta = (cta: unknown) => configDocumentSchema.safeParse({ ...validDocument, cta });

	it("rejects a CTA with a label but no href", () => {
		expect(withCta({ label: "Go home", href: "" }).success).toBe(false);
	});

	it("rejects a CTA with an href but no label", () => {
		expect(withCta({ label: "", href: "/" }).success).toBe(false);
	});

	it("treats a CTA with both fields blank as no CTA", () => {
		const result = withCta({ label: "", href: "" });
		expect(result.success).toBe(true);
		expect(result.data?.cta).toBeNull();
	});

	it("accepts an absolute https URL as the href", () => {
		expect(withCta({ label: "Docs", href: "https://example.com/docs?x=1#top" }).success).toBe(true);
	});

	it.each([
		["http://example.com/", "plain http"],
		["javascript:alert(1)", "javascript scheme"],
		["//evil.example/", "protocol-relative"],
		["about", "path without a leading slash"],
	])("rejects %s (%s) as the href", (href) => {
		expect(withCta({ label: "Go", href }).success).toBe(false);
	});
});

describe("configDocumentSchema image rules", () => {
	const withImage = (image: unknown) => configDocumentSchema.safeParse({ ...validDocument, image });
	const externalImage = {
		source: "external",
		value: { id: "", provider: "external", src: "https://cdn.example.com/lost.png" },
		alt: "A lost balloon",
		verifiedAt: "2026-09-14T09:00:00.000Z",
	};

	it("accepts no image", () => {
		expect(withImage(null).success).toBe(true);
	});

	it("rejects an image with blank alt text", () => {
		expect(withImage({ ...validDocument.image, alt: "  " }).success).toBe(false);
	});

	it("accepts an external image stored as an external MediaValue with a verification timestamp", () => {
		expect(withImage(externalImage).success).toBe(true);
	});

	it("rejects an external image whose value is not provider external", () => {
		const value = { ...externalImage.value, provider: "local" };
		expect(withImage({ ...externalImage, value }).success).toBe(false);
	});

	it("rejects an external image whose src is not https", () => {
		const value = { ...externalImage.value, src: "http://cdn.example.com/lost.png" };
		expect(withImage({ ...externalImage, value }).success).toBe(false);
	});

	it("rejects a library image that carries a verification timestamp", () => {
		expect(withImage({ ...validDocument.image, verifiedAt: externalImage.verifiedAt }).success).toBe(false);
	});

	it("rejects a verification timestamp that is not an ISO datetime", () => {
		expect(withImage({ ...externalImage, verifiedAt: "yesterday" }).success).toBe(false);
	});
});

describe("configDocumentSchema envelope", () => {
	it("rejects an unknown placement", () => {
		expect(configDocumentSchema.safeParse({ ...validDocument, placement: "background" }).success).toBe(false);
	});

	it("rejects a document with a different version", () => {
		expect(configDocumentSchema.safeParse({ ...validDocument, version: 2 }).success).toBe(false);
	});

	it("rejects an updatedAt that is not an ISO datetime", () => {
		expect(configDocumentSchema.safeParse({ ...validDocument, updatedAt: "last week" }).success).toBe(false);
	});
});

describe("defaultConfig", () => {
	it("is a valid, disabled document with the image above the text", () => {
		const doc = defaultConfig();
		expect(configDocumentSchema.safeParse(doc).success).toBe(true);
		expect(doc).toMatchObject({ version: 1, enabled: false, cta: null, image: null, placement: "above" });
	});
});

describe("readConfig", () => {
	it("returns the default document when nothing is stored", async () => {
		await expect(readConfig(fakeKv())).resolves.toEqual(defaultConfig());
	});

	it("returns the stored version 1 document", async () => {
		await expect(readConfig(fakeKv({ config: validDocument }))).resolves.toEqual(validDocument);
	});

	it("throws on a stored document with a version it cannot migrate", async () => {
		const kv = fakeKv({ config: { ...validDocument, version: 99 } });
		await expect(readConfig(kv)).rejects.toThrow(/version/);
	});
});

describe("saveInputSchema", () => {
	const { version: _version, updatedAt: _updatedAt, ...editable } = validDocument;

	it("accepts the editable fields without version or updatedAt", () => {
		expect(saveInputSchema.safeParse(editable).success).toBe(true);
	});

	it("drops a client-supplied version and updatedAt", () => {
		const result = saveInputSchema.safeParse({ ...editable, version: 7, updatedAt: "2000-01-01T00:00:00.000Z" });
		expect(result.success).toBe(true);
		expect(result.data).not.toHaveProperty("version");
		expect(result.data).not.toHaveProperty("updatedAt");
	});

	it("enforces the same cross-field rules as the document", () => {
		expect(saveInputSchema.safeParse({ ...editable, headline: "" }).success).toBe(false);
	});
});
