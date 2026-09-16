import type { MediaItem } from "@emdash-cms/admin";
import { describe, expect, it } from "vitest";

import { defaultConfig, type ConfigDocument } from "../config";
import {
	emptyForm,
	formFromConfig,
	mediaItemToValue,
	prepareSave,
	thumbnailUrl,
	validateForm,
	type FormState,
} from "./form";

const localItem: MediaItem = {
	id: "01HX",
	filename: "balloon.jpg",
	mimeType: "image/jpeg",
	url: "/_emdash/api/media/file/01HX.jpg",
	storageKey: "01HX.jpg",
	size: 1234,
	width: 800,
	height: 600,
	focalX: 0.5,
	focalY: 0.25,
	blurhash: "LEHV6nWB2yk8",
	dominantColor: "#aabbcc",
	alt: "A lost balloon",
	createdAt: "2026-09-01T00:00:00.000Z",
};

const savedLibraryDoc: ConfigDocument = {
	version: 1,
	enabled: true,
	headline: "Page not found",
	body: "Sorry.\n\nTry the homepage.",
	cta: { label: "Go home", href: "/" },
	image: {
		source: "library",
		value: mediaItemToValue(localItem),
		alt: "A lost balloon",
	},
	placement: "left",
	updatedAt: "2026-09-14T10:00:00.000Z",
};

const savedExternalDoc: ConfigDocument = {
	...savedLibraryDoc,
	image: {
		source: "external",
		value: { id: "", provider: "external", src: "https://cdn.example.com/lost.png" },
		alt: "Lost",
		verifiedAt: "2026-09-14T09:00:00.000Z",
	},
};

/** A verified external image form, the most constrained saveable state. */
function verifiedExternalForm(): FormState {
	return {
		...emptyForm(),
		enabled: true,
		headline: "Page not found",
		imageSource: "external",
		externalUrl: "https://cdn.example.com/lost.png",
		externalVerification: {
			url: "https://cdn.example.com/lost.png",
			verifiedAt: "2026-09-14T09:00:00.000Z",
		},
		alt: "Lost",
	};
}

describe("formFromConfig", () => {
	it("maps the default document to an empty, disabled form with no image", () => {
		const form = formFromConfig(defaultConfig());
		expect(form).toEqual(emptyForm());
		expect(form.enabled).toBe(false);
		expect(form.imageSource).toBe("none");
		expect(form.placement).toBe("above");
	});

	it("maps a CTA to its two fields", () => {
		const form = formFromConfig(savedLibraryDoc);
		expect(form.ctaLabel).toBe("Go home");
		expect(form.ctaHref).toBe("/");
	});

	it("maps a library image to the library source with its value and alt", () => {
		const form = formFromConfig(savedLibraryDoc);
		expect(form.imageSource).toBe("library");
		expect(form.libraryImage).toEqual(savedLibraryDoc.image?.value);
		expect(form.alt).toBe("A lost balloon");
		expect(form.externalUrl).toBe("");
		expect(form.externalVerification).toBeNull();
	});

	it("maps a verified external image to the external source with its stamp", () => {
		const form = formFromConfig(savedExternalDoc);
		expect(form.imageSource).toBe("external");
		expect(form.externalUrl).toBe("https://cdn.example.com/lost.png");
		expect(form.externalVerification).toEqual({
			url: "https://cdn.example.com/lost.png",
			verifiedAt: "2026-09-14T09:00:00.000Z",
		});
		expect(form.libraryImage).toBeNull();
	});

	it("leaves an external image without a timestamp unverified", () => {
		const image = { ...savedExternalDoc.image!, verifiedAt: undefined };
		const form = formFromConfig({ ...savedExternalDoc, image });
		expect(form.externalVerification).toBeNull();
	});
});

describe("validateForm", () => {
	it("accepts a disabled, empty form", () => {
		expect(validateForm(emptyForm())).toEqual({});
	});

	it("requires a headline when enabled", () => {
		const errors = validateForm({ ...emptyForm(), enabled: true, headline: "  " });
		expect(errors.headline).toMatch(/required/i);
	});

	it("enforces the headline length limit", () => {
		const errors = validateForm({ ...emptyForm(), headline: "x".repeat(201) });
		expect(errors.headline).toBeDefined();
	});

	it("requires both CTA fields or neither", () => {
		expect(validateForm({ ...emptyForm(), ctaLabel: "Go" }).ctaHref).toMatch(/required/i);
		expect(validateForm({ ...emptyForm(), ctaHref: "/" }).ctaLabel).toMatch(/required/i);
	});

	it("rejects a CTA URL that is neither a relative path nor https", () => {
		const errors = validateForm({ ...emptyForm(), ctaLabel: "Go", ctaHref: "http://example.com" });
		expect(errors.ctaHref).toMatch(/https/);
	});

	it("requires a chosen image when the source is library", () => {
		const errors = validateForm({ ...emptyForm(), imageSource: "library", alt: "x" });
		expect(errors.image).toMatch(/choose/i);
	});

	it("requires alt text when a library image is chosen", () => {
		const form: FormState = {
			...emptyForm(),
			imageSource: "library",
			libraryImage: mediaItemToValue(localItem),
			alt: " ",
		};
		expect(validateForm(form).alt).toMatch(/required/i);
	});

	it("requires an external URL when the source is external", () => {
		const errors = validateForm({ ...emptyForm(), imageSource: "external", alt: "x" });
		expect(errors.externalUrl).toMatch(/enter/i);
	});

	it("blocks save while the external URL is unverified", () => {
		const form = { ...verifiedExternalForm(), externalVerification: null };
		expect(validateForm(form).externalUrl).toMatch(/verify/i);
	});

	it("treats a verification for a different URL as unverified", () => {
		const form = { ...verifiedExternalForm(), externalUrl: "https://cdn.example.com/other.png" };
		expect(validateForm(form).externalUrl).toMatch(/verify/i);
	});

	it("ignores surrounding whitespace when matching the verified URL", () => {
		const form = { ...verifiedExternalForm(), externalUrl: "  https://cdn.example.com/lost.png " };
		expect(validateForm(form)).toEqual({});
	});

	it("requires alt text for a verified external image", () => {
		expect(validateForm({ ...verifiedExternalForm(), alt: "" }).alt).toMatch(/required/i);
	});

	it("accepts a verified external image with alt text", () => {
		expect(validateForm(verifiedExternalForm())).toEqual({});
	});
});

describe("prepareSave", () => {
	it("returns the errors and no input when the form is not saveable", () => {
		const result = prepareSave({ ...emptyForm(), enabled: true });
		expect(result).toMatchObject({ ok: false, errors: { headline: expect.any(String) } });
	});

	it("builds a save input with null CTA and image from an empty form", () => {
		const result = prepareSave(emptyForm());
		expect(result).toEqual({
			ok: true,
			input: { enabled: false, headline: "", body: "", cta: null, image: null, placement: "above" },
		});
	});

	it("round-trips a saved library document through the form", () => {
		const result = prepareSave(formFromConfig(savedLibraryDoc));
		const { version: _v, updatedAt: _u, ...expected } = savedLibraryDoc;
		expect(result).toEqual({ ok: true, input: expected });
	});

	it("builds an external image value with its verification stamp", () => {
		const result = prepareSave(verifiedExternalForm());
		expect(result).toMatchObject({
			ok: true,
			input: {
				image: {
					source: "external",
					value: { id: "", provider: "external", src: "https://cdn.example.com/lost.png" },
					alt: "Lost",
					verifiedAt: "2026-09-14T09:00:00.000Z",
				},
			},
		});
	});

	it("drops image fields when the source is none", () => {
		const form: FormState = { ...verifiedExternalForm(), imageSource: "none" };
		expect(prepareSave(form)).toMatchObject({ ok: true, input: { image: null } });
	});
});

describe("mediaItemToValue", () => {
	it("stores a local item with its storage key in meta and no src", () => {
		expect(mediaItemToValue(localItem)).toEqual({
			id: "01HX",
			provider: "local",
			src: undefined,
			previewUrl: undefined,
			alt: "A lost balloon",
			width: 800,
			height: 600,
			focalX: 0.5,
			focalY: 0.25,
			filename: "balloon.jpg",
			mimeType: "image/jpeg",
			blurhash: "LEHV6nWB2yk8",
			dominantColor: "#aabbcc",
			meta: { storageKey: "01HX.jpg" },
		});
	});

	it("stores a picker URL item as an external value with src", () => {
		const item: MediaItem = {
			...localItem,
			id: "",
			provider: "external-url",
			storageKey: undefined,
			url: "https://cdn.example.com/x.png",
		};
		const value = mediaItemToValue(item);
		expect(value.provider).toBe("external");
		expect(value.src).toBe("https://cdn.example.com/x.png");
		expect(value.previewUrl).toBeUndefined();
		expect(value.meta).toBeUndefined();
	});

	it("keeps another provider's URL as previewUrl and passes its meta through", () => {
		const item: MediaItem = {
			...localItem,
			provider: "cloudflare-images",
			storageKey: undefined,
			url: "https://imagedelivery.net/abc/public",
			meta: { variant: "public" },
		};
		const value = mediaItemToValue(item);
		expect(value.provider).toBe("cloudflare-images");
		expect(value.previewUrl).toBe("https://imagedelivery.net/abc/public");
		expect(value.src).toBeUndefined();
		expect(value.meta).toEqual({ variant: "public" });
	});

	it("turns null focal coordinates and a missing alt into undefined and empty", () => {
		const value = mediaItemToValue({ ...localItem, focalX: null, focalY: null, alt: undefined });
		expect(value.focalX).toBeUndefined();
		expect(value.focalY).toBeUndefined();
		expect(value.alt).toBe("");
	});
});

describe("thumbnailUrl", () => {
	it("uses the media file route with the storage key for local media", () => {
		expect(thumbnailUrl(mediaItemToValue(localItem))).toBe("/_emdash/api/media/file/01HX.jpg");
	});

	it("falls back to the id for local media without a storage key", () => {
		expect(thumbnailUrl({ id: "01HX", provider: "local" })).toBe("/_emdash/api/media/file/01HX");
	});

	it("encodes the storage key", () => {
		expect(thumbnailUrl({ id: "x", meta: { storageKey: "a b/c.jpg" } })).toBe(
			"/_emdash/api/media/file/a%20b%2Fc.jpg",
		);
	});

	it("uses src for external and previewUrl for other providers", () => {
		expect(thumbnailUrl({ id: "", provider: "external", src: "https://e/x.png" })).toBe(
			"https://e/x.png",
		);
		expect(thumbnailUrl({ id: "1", provider: "cf", previewUrl: "https://cf/x" })).toBe(
			"https://cf/x",
		);
	});

	it("returns undefined for a non-local provider with no URL", () => {
		expect(thumbnailUrl({ id: "1", provider: "cf" })).toBeUndefined();
	});
});
