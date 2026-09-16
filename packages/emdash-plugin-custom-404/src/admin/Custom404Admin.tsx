/**
 * The plugin's admin page, mounted at `/_emdash/admin/plugins/custom-404/`.
 *
 * All rules live in `./form` and all network calls in `./api`; this file
 * only holds React state and markup. It is styled with the utility classes
 * the admin's own settings pages use so it matches without importing a
 * component library. The one admin import is `MediaPickerModal`, the same
 * picker core's image fields open.
 */
import { MediaPickerModal, type MediaItem } from "@emdash-cms/admin";
import { useEffect, useId, useState, type ReactNode } from "react";

import { LIMITS, NEVER_SAVED, placementSchema } from "../config";
import { adminApi, type ApiOutcome } from "./api";
import {
	currentVerification,
	emptyForm,
	formFromConfig,
	imageSourceOptions,
	imageSourceSchema,
	mediaItemToValue,
	placementOptions,
	prepareSave,
	thumbnailUrl,
	validateForm,
	type FieldErrors,
	type FormField,
	type FormState,
	type Option,
} from "./form";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready" };
type Notice = { tone: "success" | "error"; text: string };

const PUBLIC_404_PATH = "/404";

export function Custom404Admin() {
	const [load, setLoad] = useState<LoadState>({ status: "loading" });
	const [form, setForm] = useState<FormState>(emptyForm);
	const [errors, setErrors] = useState<FieldErrors>({});
	const [updatedAt, setUpdatedAt] = useState<string>(NEVER_SAVED);
	const [saving, setSaving] = useState(false);
	const [notice, setNotice] = useState<Notice | null>(null);
	const [verifying, setVerifying] = useState(false);
	const [verifyFailure, setVerifyFailure] = useState<string | null>(null);
	const [pickerOpen, setPickerOpen] = useState(false);

	useEffect(() => {
		let cancelled = false;
		// `loadConfig` never rejects: every failure comes back as an outcome.
		void adminApi.loadConfig().then((result) => {
			if (cancelled) return;
			if (result.kind === "ok") {
				setForm(formFromConfig(result.data));
				setUpdatedAt(result.data.updatedAt);
				setLoad({ status: "ready" });
			} else {
				setLoad({ status: "error", message: describeFailure(result, "load the configuration") });
			}
		});
		return () => {
			cancelled = true;
		};
	}, []);

	/** Apply a change and drop the errors for the fields it touched. */
	function update(patch: Partial<FormState>, ...clear: FormField[]) {
		setForm((current) => ({ ...current, ...patch }));
		if (clear.length > 0) {
			setErrors((current) => {
				const next = { ...current };
				for (const field of clear) delete next[field];
				return next;
			});
		}
		setNotice(null);
	}

	async function handleSave() {
		const prepared = prepareSave(form);
		if (!prepared.ok) {
			setErrors(prepared.errors);
			setNotice({ tone: "error", text: "Fix the highlighted fields and try again." });
			return;
		}
		setSaving(true);
		setNotice(null);
		const result = await adminApi.saveConfig(prepared.input);
		setSaving(false);
		if (result.kind === "ok") {
			setForm(formFromConfig(result.data));
			setUpdatedAt(result.data.updatedAt);
			setErrors({});
			setNotice({ tone: "success", text: "Saved." });
			return;
		}
		if (result.kind === "validation") {
			// The host does not forward per-field details (see `./api`), so a
			// server rejection is placed using the same schema the route ran.
			const fields = Object.keys(result.fields).length > 0 ? result.fields : validateForm(form);
			setErrors(fields);
		}
		setNotice({ tone: "error", text: describeFailure(result, "save") });
	}

	async function handleVerify() {
		const url = form.externalUrl.trim();
		if (url === "") return;
		setVerifying(true);
		setVerifyFailure(null);
		const result = await adminApi.verifyUrl(url);
		setVerifying(false);
		if (result.kind !== "ok") {
			setVerifyFailure(describeFailure(result, "verify the URL"));
		} else if (result.data.ok) {
			update({ externalVerification: { url, verifiedAt: result.data.verifiedAt } }, "externalUrl");
		} else {
			setVerifyFailure(result.data.reason);
		}
	}

	function handlePick(item: MediaItem) {
		const value = mediaItemToValue(item);
		const alt = form.alt.trim() === "" ? (value.alt ?? "") : form.alt;
		update({ libraryImage: value, alt }, "image", "alt");
		setPickerOpen(false);
	}

	const verification = currentVerification(form);
	const unverifiedExternal =
		form.imageSource === "external" && form.externalUrl.trim() !== "" && verification === null;
	const canSave = load.status === "ready" && !saving && !unverifiedExternal;

	return (
		<div className="space-y-6 max-w-3xl">
			<header className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="text-2xl font-semibold leading-tight">Custom 404</h1>
				<div className="flex items-center gap-2">
					<a
						className={secondaryButton}
						href={PUBLIC_404_PATH}
						target="_blank"
						rel="noopener noreferrer"
					>
						View 404 page
					</a>
					<button
						type="button"
						className={primaryButton}
						onClick={handleSave}
						disabled={!canSave}
						title={unverifiedExternal ? "Verify the external image URL before saving" : undefined}
					>
						{saving ? "Saving…" : "Save"}
					</button>
				</div>
			</header>

			{load.status === "loading" && (
				<section className={cardClass}>
					<p className={helpClass}>Loading configuration…</p>
				</section>
			)}

			{load.status === "error" && (
				<section className={cardClass}>
					<ErrorText>{load.message}</ErrorText>
				</section>
			)}

			{load.status === "ready" && (
				<form
					className="space-y-6"
					noValidate
					onSubmit={(event) => {
						event.preventDefault();
						void handleSave();
					}}
				>
					{notice && (
						<output
							className={
								notice.tone === "success"
									? "block rounded-lg p-3 text-sm bg-kumo-success-tint text-kumo-success"
									: "block rounded-lg p-3 text-sm bg-kumo-danger-tint text-kumo-danger"
							}
						>
							{notice.text}
						</output>
					)}
					{errors.form && <ErrorText>{errors.form}</ErrorText>}

					<section className={cardClass}>
						<Toggle
							label="Enabled"
							hint="When off, the site's own 404 markup shows. The page still returns a 404 status either way."
							checked={form.enabled}
							onChange={(enabled) => update({ enabled }, "headline")}
						/>
						<TextField
							label="Headline"
							value={form.headline}
							max={LIMITS.headline}
							error={errors.headline}
							hint="Required when enabled."
							onChange={(headline) => update({ headline }, "headline")}
						/>
						<TextField
							label="Body"
							value={form.body}
							max={LIMITS.body}
							multiline
							error={errors.body}
							hint="Plain text. A blank line starts a new paragraph."
							onChange={(body) => update({ body }, "body")}
						/>
					</section>

					<section className={cardClass}>
						<h2 className={sectionTitleClass}>Call to action</h2>
						<p className={helpClass}>
							Optional. Set both fields or neither. Opens in the same tab.
						</p>
						<TextField
							label="CTA label"
							value={form.ctaLabel}
							max={LIMITS.ctaLabel}
							error={errors.ctaLabel}
							onChange={(ctaLabel) => update({ ctaLabel }, "ctaLabel", "ctaHref")}
						/>
						<TextField
							label="CTA URL"
							value={form.ctaHref}
							error={errors.ctaHref}
							hint="A relative path such as /contact, or an https URL."
							placeholder="/"
							onChange={(ctaHref) => update({ ctaHref }, "ctaLabel", "ctaHref")}
						/>
					</section>

					<section className={cardClass}>
						<h2 className={sectionTitleClass}>Image</h2>
						<RadioGroup
							label="Image source"
							name="image-source"
							value={form.imageSource}
							options={imageSourceOptions}
							onChange={(raw) => {
								setVerifyFailure(null);
								update(
									{ imageSource: imageSourceSchema.parse(raw) },
									"image",
									"externalUrl",
									"alt",
								);
							}}
						/>

						{form.imageSource === "library" && (
							<LibraryImage
								value={form.libraryImage}
								error={errors.image}
								onChoose={() => setPickerOpen(true)}
								onRemove={() => update({ libraryImage: null }, "image")}
							/>
						)}

						{form.imageSource === "external" && (
							<ExternalImage
								url={form.externalUrl}
								verifiedAt={verification?.verifiedAt ?? null}
								verifying={verifying}
								failure={verifyFailure}
								error={errors.externalUrl}
								onChange={(externalUrl) => {
									setVerifyFailure(null);
									update({ externalUrl }, "externalUrl");
								}}
								onVerify={() => void handleVerify()}
							/>
						)}

						{form.imageSource !== "none" && (
							<>
								<TextField
									label="Alt text"
									value={form.alt}
									max={LIMITS.alt}
									error={errors.alt}
									hint="Required when an image is set. Describes the image for screen readers."
									onChange={(alt) => update({ alt }, "alt")}
								/>
								<SelectField
									label="Placement"
									value={form.placement}
									options={placementOptions}
									error={errors.placement}
									hint="Where the image sits relative to the text. Left and right stack on narrow screens."
									onChange={(raw) => update({ placement: placementSchema.parse(raw) }, "placement")}
								/>
							</>
						)}
					</section>

					<p className={helpClass}>
						{updatedAt === NEVER_SAVED
							? "Never saved."
							: `Last saved ${formatTimestamp(updatedAt)}.`}
					</p>
				</form>
			)}

			<MediaPickerModal
				open={pickerOpen}
				onOpenChange={setPickerOpen}
				onSelect={handlePick}
				mediaKind="image"
				title="Choose an image"
				hideUrlInput
			/>
		</div>
	);
}

/** A sentence for each way a call can fail, with the permission case spelled out for authors. */
function describeFailure(
	result: Exclude<ApiOutcome<unknown>, { kind: "ok" }>,
	action: string,
): string {
	switch (result.kind) {
		case "forbidden":
			return `You do not have permission to ${action}. Saving the 404 page needs the editor role or higher. (${result.message})`;
		case "unauthenticated":
			return "Your session has ended. Sign in again and retry.";
		case "validation":
		case "error":
			return `Could not ${action}: ${result.message}`;
		default:
			return result satisfies never;
	}
}

function formatTimestamp(iso: string): string {
	const date = new Date(iso);
	return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

/* ---- Presentational pieces. Class strings mirror the admin's Kumo inputs and buttons. ---- */

const cardClass = "rounded-lg border bg-kumo-base p-6 space-y-4";
const sectionTitleClass = "text-base font-semibold text-kumo-default";
const labelClass = "block text-base font-medium text-kumo-default";
const helpClass = "text-sm leading-snug text-kumo-subtle";
const dangerClass = "text-sm leading-snug text-kumo-danger";
const inputBase =
	"w-full rounded-lg px-3 text-base border-0 bg-kumo-control text-kumo-default ring ring-kumo-line outline-none focus:outline-none focus:ring-kumo-focus/50 focus:ring-[1.5px]";
const inputInvalid = "!ring-kumo-danger";
const buttonBase =
	"inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-base font-medium select-none cursor-pointer border-0 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed";
const primaryButton = `${buttonBase} bg-kumo-brand text-white`;
const secondaryButton = `${buttonBase} bg-kumo-base text-kumo-default ring ring-kumo-line not-disabled:hover:bg-kumo-tint`;

function ErrorText(props: { id?: string; children: ReactNode }) {
	return (
		<p id={props.id} role="alert" className={dangerClass}>
			{props.children}
		</p>
	);
}

function Thumbnail(props: { src: string }) {
	return (
		<img
			src={props.src}
			alt=""
			className="max-h-40 max-w-xs rounded-lg bg-kumo-tint object-contain ring ring-kumo-line"
		/>
	);
}

function Field(props: {
	id: string;
	label: string;
	hint?: string;
	error?: string;
	children: ReactNode;
}) {
	return (
		<div className="space-y-1">
			<label htmlFor={props.id} className={labelClass}>
				{props.label}
			</label>
			{props.children}
			{props.hint && (
				<p id={`${props.id}-hint`} className={helpClass}>
					{props.hint}
				</p>
			)}
			{props.error && <ErrorText id={`${props.id}-error`}>{props.error}</ErrorText>}
		</div>
	);
}

function describedBy(id: string, hint?: string, error?: string): string | undefined {
	const ids = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean);
	return ids.length > 0 ? ids.join(" ") : undefined;
}

function TextField(props: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	max?: number;
	multiline?: boolean;
	hint?: string;
	error?: string;
	placeholder?: string;
}) {
	const id = useId();
	const invalid = props.error !== undefined;
	const shared = {
		id,
		value: props.value,
		placeholder: props.placeholder,
		maxLength: props.max,
		"aria-invalid": invalid || undefined,
		"aria-describedby": describedBy(id, props.hint, props.error),
	};
	return (
		<Field id={id} label={props.label} hint={props.hint} error={props.error}>
			<div className="space-y-1">
				{props.multiline ? (
					<textarea
						{...shared}
						className={`${inputBase} min-h-32 py-2 resize-y ${invalid ? inputInvalid : ""}`}
						onChange={(event) => props.onChange(event.target.value)}
					/>
				) : (
					<input
						{...shared}
						type="text"
						className={`${inputBase} h-9 ${invalid ? inputInvalid : ""}`}
						onChange={(event) => props.onChange(event.target.value)}
					/>
				)}
				{props.max !== undefined && (
					<span className="text-xs text-kumo-subtle tabular-nums">
						{props.value.length}/{props.max}
					</span>
				)}
			</div>
		</Field>
	);
}

function SelectField<T extends string>(props: {
	label: string;
	value: T;
	options: ReadonlyArray<Option<T>>;
	onChange: (value: string) => void;
	hint?: string;
	error?: string;
}) {
	const id = useId();
	return (
		<Field id={id} label={props.label} hint={props.hint} error={props.error}>
			<select
				id={id}
				className={`${inputBase} h-9 ${props.error ? inputInvalid : ""}`}
				value={props.value}
				aria-invalid={props.error !== undefined || undefined}
				aria-describedby={describedBy(id, props.hint, props.error)}
				onChange={(event) => props.onChange(event.target.value)}
			>
				{props.options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</Field>
	);
}

function Toggle(props: {
	label: string;
	hint?: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}) {
	const id = useId();
	return (
		<div className="flex items-start justify-between gap-4">
			<div className="space-y-1">
				<label htmlFor={id} className={labelClass}>
					{props.label}
				</label>
				{props.hint && <p className={helpClass}>{props.hint}</p>}
			</div>
			<input
				id={id}
				type="checkbox"
				role="switch"
				className="size-5 shrink-0 cursor-pointer"
				checked={props.checked}
				aria-checked={props.checked}
				onChange={(event) => props.onChange(event.target.checked)}
			/>
		</div>
	);
}

function RadioGroup<T extends string>(props: {
	label: string;
	name: string;
	value: T;
	options: ReadonlyArray<Option<T>>;
	onChange: (value: string) => void;
}) {
	const id = useId();
	return (
		<fieldset className="space-y-1">
			<legend className={labelClass}>{props.label}</legend>
			<div className="flex flex-wrap gap-4">
				{props.options.map((option) => {
					const optionId = `${id}-${option.value}`;
					return (
						<label
							key={option.value}
							htmlFor={optionId}
							className="inline-flex items-center gap-2 cursor-pointer"
						>
							<input
								id={optionId}
								type="radio"
								name={props.name}
								value={option.value}
								checked={props.value === option.value}
								onChange={() => props.onChange(option.value)}
							/>
							<span className="text-base text-kumo-default">{option.label}</span>
						</label>
					);
				})}
			</div>
		</fieldset>
	);
}

function LibraryImage(props: {
	value: FormState["libraryImage"];
	error?: string;
	onChoose: () => void;
	onRemove: () => void;
}) {
	const src = props.value ? thumbnailUrl(props.value) : undefined;
	return (
		<div className="space-y-2">
			<div className="flex flex-wrap items-center gap-3">
				{src && <Thumbnail src={src} />}
				<div className="space-y-2 min-w-0">
					{props.value && (
						<p className="text-sm text-kumo-subtle truncate">
							{props.value.filename ?? props.value.id}
						</p>
					)}
					<div className="flex flex-wrap gap-2">
						<button type="button" className={secondaryButton} onClick={props.onChoose}>
							{props.value ? "Change image" : "Choose image"}
						</button>
						{props.value && (
							<button type="button" className={secondaryButton} onClick={props.onRemove}>
								Remove
							</button>
						)}
					</div>
				</div>
			</div>
			{props.error && <ErrorText>{props.error}</ErrorText>}
		</div>
	);
}

function ExternalImage(props: {
	url: string;
	verifiedAt: string | null;
	verifying: boolean;
	failure: string | null;
	error?: string;
	onChange: (url: string) => void;
	onVerify: () => void;
}) {
	const id = useId();
	const invalid = props.error !== undefined || props.failure !== null;
	const trimmed = props.url.trim();
	return (
		<div className="space-y-1">
			<label htmlFor={id} className={labelClass}>
				Image URL
			</label>
			<div className="flex flex-wrap items-center gap-2">
				<input
					id={id}
					type="url"
					inputMode="url"
					placeholder="https://"
					className={`${inputBase} h-9 flex-1 min-w-0 ${invalid ? inputInvalid : ""}`}
					value={props.url}
					aria-invalid={invalid || undefined}
					aria-describedby={`${id}-status`}
					onChange={(event) => props.onChange(event.target.value)}
				/>
				<button
					type="button"
					className={secondaryButton}
					onClick={props.onVerify}
					disabled={props.verifying || trimmed === ""}
				>
					{props.verifying ? "Verifying…" : "Verify"}
				</button>
			</div>
			{props.verifiedAt && <Thumbnail src={trimmed} />}
			<p id={`${id}-status`} className={helpClass}>
				Only https URLs. The server checks that the URL answers with an image before it can be
				saved.
			</p>
			{props.verifiedAt ? (
				<p className="text-sm leading-snug text-kumo-success">
					Verified {formatTimestamp(props.verifiedAt)}.
				</p>
			) : props.failure ? (
				<ErrorText>{props.failure}</ErrorText>
			) : props.error ? (
				<ErrorText>{props.error}</ErrorText>
			) : trimmed !== "" ? (
				<p className="text-sm leading-snug text-kumo-warning">
					Not verified yet. Verify before saving.
				</p>
			) : null}
		</div>
	);
}
