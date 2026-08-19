"use client";

import { ImageOff, Pencil, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { formatPeso } from "@/lib/currency";
import { ProductImageUploader } from "./product-image-uploader";

type RecordItem = {
  id: string;
  name: string;
  is_available?: boolean;
  price_centavos?: number;
  description?: string | null;
  image_url?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  sort_order: number;
};

const pageSize = 12;

export function CatalogManager({
  table,
  items,
  priceable = false,
  categories = [],
}: {
  table: "products" | "addons";
  items: RecordItem[];
  priceable?: boolean;
  categories?: Array<{ id: string; name: string }>;
}) {
  const singular = table === "products" ? "menu item" : "add-on";
  const tableColumns =
    table === "products"
      ? "grid-cols-[3rem_minmax(0,1fr)] sm:grid-cols-[4rem_minmax(15rem,1fr)_8rem_8rem_7rem]"
      : "grid-cols-1 sm:grid-cols-[minmax(15rem,1fr)_8rem_8rem_7rem]";
  const [rows, setRows] = useState(items);
  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState("all");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<RecordItem | null>(null);
  const [draft, setDraft] = useState<Partial<RecordItem>>({});

  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return rows.filter((item) => {
      const matchesSearch =
        !search ||
        item.name.toLocaleLowerCase().includes(search) ||
        item.description?.toLocaleLowerCase().includes(search);
      const matchesAvailability =
        availability === "all" ||
        (availability === "available" ? item.is_available !== false : item.is_available === false);
      const matchesCategory =
        table !== "products" || category === "all" || item.category_id === category;
      return matchesSearch && matchesAvailability && matchesCategory;
    });
  }, [availability, category, query, rows, table]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const shown = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const closeEditor = () => {
    setEditing(null);
    setDraft({});
  };
  const openEditor = (item: RecordItem) => {
    setEditing(item);
    setDraft({ ...item });
  };
  const updateDraft = (values: Partial<RecordItem>) =>
    setDraft((current) => ({ ...current, ...values }));
  const removeStoredImage = async (url: string | null | undefined) => {
    const marker = "/storage/v1/object/public/payment-assets/";
    const path = url?.split(marker)[1];
    if (path)
      await createClient()
        .storage.from("payment-assets")
        .remove([decodeURIComponent(path)]);
  };
  const saveEditor = async () => {
    if (!editing || !draft.name?.trim()) return;
    const values: Record<string, unknown> = {
      name: draft.name.trim(),
      is_available: draft.is_available !== false,
      ...(priceable ? { price_centavos: draft.price_centavos ?? 0 } : {}),
      ...(table === "products"
        ? {
            category_id: draft.category_id || null,
            description: draft.description?.trim() || null,
            image_url: draft.image_url || null,
          }
        : {}),
    };
    const { error } = await createClient().from(table).update(values).eq("id", editing.id);
    if (error) {
      setMessage("Could not save changes. Please try again.");
      return;
    }
    if (table === "products" && editing.image_url !== draft.image_url) {
      await removeStoredImage(editing.image_url);
    }
    const categoryName = categories.find((item) => item.id === draft.category_id)?.name ?? null;
    setRows((current) =>
      current.map((item) =>
        item.id === editing.id ? { ...item, ...values, category_name: categoryName } : item,
      ),
    );
    setMessage("Changes saved.");
    closeEditor();
  };
  const createItem = async (formData: FormData) => {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    const values: Record<string, unknown> = { name, sort_order: rows.length + 1 };
    if (priceable) values.price_centavos = Math.round(Number(formData.get("price")) * 100);
    if (table === "products") {
      values.category_id = String(formData.get("category_id") ?? "");
      values.description = String(formData.get("description") ?? "").trim() || null;
    }
    const { data, error } = await createClient().from(table).insert(values).select().single();
    if (error || !data) {
      setMessage("Could not add item. Choose a category and check the price.");
      return;
    }
    const categoryName = categories.find((item) => item.id === values.category_id)?.name ?? null;
    setRows((current) => [...current, { ...(data as RecordItem), category_name: categoryName }]);
    setCreateOpen(false);
    setMessage(singular.charAt(0).toUpperCase() + singular.slice(1) + " added.");
  };

  return (
    <>
      <div
        className={
          "card grid gap-3 p-4 sm:grid-cols-2 " +
          (table === "products" ? "lg:grid-cols-4" : "lg:grid-cols-3")
        }
      >
        <label className="relative block min-w-0 flex-1">
          <span className="form-label">Search {table}</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute bottom-3 left-3 text-[var(--color-muted)]"
            size={16}
          />
          <input
            className="field with-leading-icon"
            value={query}
            placeholder={"Search " + table + " by name or description"}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        {table === "products" && (
          <label className="block">
            <span className="form-label">Category</span>
            <select
              className="field"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All categories</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <span className="form-label">Availability</span>
          <select
            className="field"
            value={availability}
            onChange={(event) => {
              setAvailability(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">All items</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </label>
        <button
          className="btn filter-action w-full whitespace-nowrap"
          type="button"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={16} /> Add {singular}
        </button>
      </div>
      {message && <p className="mt-3 text-sm text-[var(--color-success)]">{message}</p>}
      <div className="mt-5 overflow-x-auto border border-[var(--color-border)]">
        <div
          className={
            "relative grid " +
            tableColumns +
            " items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-xs font-bold uppercase tracking-wide"
          }
        >
          {table === "products" && <span className="hidden sm:block">Image</span>}
          <span className="pr-14 sm:pr-0">{table === "products" ? "Item details" : "Add-on"}</span>
          <span className="absolute right-4 top-3 sm:static">Price</span>
          <span className="hidden sm:block">Status</span>
          <span className="hidden text-right sm:block">Actions</span>
        </div>
        {shown.map((item) => (
          <article
            className={
              "grid " +
              tableColumns +
              " relative items-start gap-3 border-b border-[var(--color-border)] px-4 pt-3 pb-14 last:border-b-0 sm:items-center sm:gap-4 sm:py-3"
            }
            key={item.id}
          >
            {table === "products" && (
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]">
                {item.image_url ? (
                  <img alt="" className="h-full w-full object-cover" src={item.image_url} />
                ) : (
                  <ImageOff aria-hidden="true" size={17} className="text-[var(--color-muted)]" />
                )}
              </div>
            )}
            <div className="min-w-0 pr-24 sm:pr-0">
              <strong className="block truncate">{item.name}</strong>
              {table === "products" && (
                <>
                  <span className="mt-1 inline-block text-xs font-bold uppercase text-[var(--color-primary)]">
                    {item.category_name || "Uncategorized"}
                  </span>
                  {item.description && (
                    <p className="mt-1 line-clamp-1 text-sm text-[var(--color-muted)]">
                      {item.description}
                    </p>
                  )}
                </>
              )}
              <div className="mt-3 sm:hidden">
                <span
                  className={
                    "text-xs font-bold uppercase " +
                    (item.is_available === false
                      ? "text-[var(--color-danger)]"
                      : "text-[var(--color-success)]")
                  }
                >
                  {item.is_available === false ? "Hidden" : "Available"}
                </span>
              </div>
            </div>
            <strong className="absolute right-4 top-4 text-sm sm:static sm:text-base">
              {formatPeso(item.price_centavos ?? 0)}
            </strong>
            <span
              className={
                "hidden text-xs font-bold uppercase sm:block " +
                (item.is_available === false
                  ? "text-[var(--color-danger)]"
                  : "text-[var(--color-success)]")
              }
            >
              {item.is_available === false ? "Hidden" : "Available"}
            </span>
            <div className="absolute right-4 top-12 sm:static sm:block sm:text-right">
              <button
                className="btn secondary !min-h-9 !px-3"
                type="button"
                onClick={() => openEditor(item)}
              >
                <Pencil size={14} /> Edit
              </button>
            </div>
          </article>
        ))}
        {!shown.length && (
          <p className={"px-4 py-12 text-center text-sm text-[var(--color-muted)] " + tableColumns}>
            No {table} match these filters.
          </p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--color-muted)]">
        <span>
          {filtered.length} {filtered.length === 1 ? singular : table} shown
        </span>
        <div className="flex gap-2">
          <button
            className="btn secondary !min-h-9 !px-3"
            type="button"
            disabled={currentPage === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </button>
          <span className="self-center text-xs">
            Page {currentPage} of {pageCount}
          </span>
          <button
            className="btn secondary !min-h-9 !px-3"
            type="button"
            disabled={currentPage === pageCount}
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
          >
            Next
          </button>
        </div>
      </div>
      {createOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            action={createItem}
            className="w-full max-w-xl border border-[var(--color-border)] bg-[var(--color-field)] p-6 shadow-[6px_6px_0_var(--color-border)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Catalogue</p>
                <h3 className="display mt-1 text-3xl">Add {singular}</h3>
              </div>
              <button
                className="btn secondary !min-h-9 !px-3"
                type="button"
                onClick={() => setCreateOpen(false)}
              >
                <X size={16} /> Close
              </button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="form-label">Name</span>
                <input className="field" name="name" required />
              </label>
              <label>
                <span className="form-label">Price (₱)</span>
                <input
                  className="field"
                  type="number"
                  min="0"
                  step="1"
                  name="price"
                  required={priceable}
                />
              </label>
              {table === "products" && (
                <label>
                  <span className="form-label">Category</span>
                  <select className="field" name="category_id" required>
                    <option value="">Choose category</option>
                    {categories.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {table === "products" && (
                <label className="sm:col-span-2">
                  <span className="form-label">Description</span>
                  <textarea className="field min-h-28" name="description" maxLength={500} />
                </label>
              )}
            </div>
            <button className="btn mt-6">Add {singular}</button>
          </form>
        </div>
      )}
      {editing && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto border border-[var(--color-border)] bg-[var(--color-field)] p-6 shadow-[6px_6px_0_var(--color-border)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Edit {singular}</p>
                <h3 className="display mt-1 text-3xl">{editing.name}</h3>
              </div>
              <button className="btn secondary !min-h-9 !px-3" type="button" onClick={closeEditor}>
                <X size={16} /> Close
              </button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="form-label">Name</span>
                <input
                  className="field"
                  value={draft.name ?? ""}
                  onChange={(event) => updateDraft({ name: event.target.value })}
                />
              </label>
              <label>
                <span className="form-label">Price (₱)</span>
                <input
                  className="field"
                  type="number"
                  min="0"
                  step="1"
                  value={(draft.price_centavos ?? 0) / 100}
                  onChange={(event) =>
                    updateDraft({ price_centavos: Math.round(Number(event.target.value) * 100) })
                  }
                />
              </label>
              {table === "products" && (
                <label>
                  <span className="form-label">Category</span>
                  <select
                    className="field"
                    value={draft.category_id ?? ""}
                    onChange={(event) => updateDraft({ category_id: event.target.value })}
                  >
                    <option value="">Choose category</option>
                    {categories.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {table === "products" && (
                <label className="sm:col-span-2">
                  <span className="form-label">Description</span>
                  <textarea
                    className="field min-h-28"
                    value={draft.description ?? ""}
                    maxLength={500}
                    onChange={(event) => updateDraft({ description: event.target.value })}
                  />
                </label>
              )}
            </div>
            {table === "products" && (
              <div className="mt-5 border-t border-[var(--color-border)] pt-5">
                {draft.image_url && (
                  <div className="flex flex-wrap items-center gap-4">
                    <img
                      className="h-20 w-20 border border-[var(--color-border)] object-cover"
                      src={draft.image_url}
                      alt={(draft.name || "Drink") + " preview"}
                    />
                    <button
                      className="btn danger !min-h-9 !px-3"
                      type="button"
                      onClick={() => updateDraft({ image_url: null })}
                    >
                      Remove image
                    </button>
                  </div>
                )}
                <ProductImageUploader
                  productId={editing.id}
                  currentUrl={editing.image_url}
                  onUploaded={async (imageUrl) => updateDraft({ image_url: imageUrl })}
                />
              </div>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-5">
              <button
                className="btn secondary !min-h-9 !px-3"
                type="button"
                onClick={() => updateDraft({ is_available: !(draft.is_available !== false) })}
              >
                {draft.is_available === false ? "Make available" : "Hide item"}
              </button>
              <button className="btn" type="button" onClick={() => void saveEditor()}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
