"use client";
import { useState } from "react";
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
  sort_order: number;
};
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
  const [rows, setRows] = useState(items);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<RecordItem>>>({});
  const updateDraft = (id: string, values: Partial<RecordItem>) =>
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...values },
    }));
  const save = async (id: string, values: Record<string, unknown>) => {
    const { error } = await createClient().from(table).update(values).eq("id", id);
    if (error) return setMessage("Could not save that change.");
    setRows((current) => current.map((item) => (item.id === id ? { ...item, ...values } : item)));
    setMessage("Saved.");
  };
  const deleteStoredImage = async (url: string | null | undefined) => {
    const marker = "/storage/v1/object/public/payment-assets/";
    const path = url?.split(marker)[1];
    if (path)
      await createClient()
        .storage.from("payment-assets")
        .remove([decodeURIComponent(path)]);
  };
  return (
    <>
      <form
        className="card p-5 grid sm:grid-cols-4 gap-3"
        action={async (formData) => {
          const name = String(formData.get("name") ?? "").trim();
          if (!name) return;
          const values: Record<string, unknown> = { name, sort_order: rows.length + 1 };
          if (priceable) values.price_centavos = Math.round(Number(formData.get("price")) * 100);
          if (table === "products") {
            values.category_id = String(formData.get("category_id") ?? "");
            values.description = String(formData.get("description") ?? "").trim() || null;
          }
          const { data, error } = await createClient().from(table).insert(values).select().single();
          if (error)
            return setMessage("Could not add item. Choose a category and check the price.");
          setRows((current) => [...current, data as unknown as RecordItem]);
          setMessage("Added.");
        }}
      >
        <input
          className="field sm:col-span-2"
          name="name"
          placeholder={`New ${table.slice(0, -1)} name`}
        />
        {priceable && (
          <input
            className="field"
            type="number"
            min="0"
            step="1"
            name="price"
            placeholder="Price (₱)"
            required
          />
        )}
        {table === "products" && (
          <select className="field" name="category_id" required>
            <option value="">Category</option>
            {categories.map((category) => (
              <option value={category.id} key={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        )}
        {table === "products" && (
          <input
            className="field sm:col-span-2"
            name="description"
            maxLength={500}
            placeholder="Drink description"
          />
        )}
        <button className="btn">Add</button>
      </form>
      {message && <p className="mt-3 text-sm">{message}</p>}
      <div className="grid gap-3 mt-5">
        {rows.map((item) => {
          const isEditing = editing === item.id;
          const draft = { ...item, ...drafts[item.id] };
          const saveDraft = async () => {
            await save(item.id, {
              name: draft.name?.trim(),
              ...(priceable ? { price_centavos: draft.price_centavos } : {}),
              ...(table === "products"
                ? {
                    description: draft.description?.trim() || null,
                    image_url: draft.image_url || null,
                  }
                : {}),
              is_available: draft.is_available,
            });
            if (table === "products" && item.image_url && !draft.image_url)
              await deleteStoredImage(item.image_url);
            setEditing(null);
            setDrafts((current) => {
              const next = { ...current };
              delete next[item.id];
              return next;
            });
          };
          return (
            <article className="card p-4 flex flex-wrap gap-3 items-center" key={item.id}>
              <input
                className="field flex-1 min-w-40"
                value={draft.name}
                disabled={!isEditing}
                onChange={(event) => updateDraft(item.id, { name: event.target.value })}
              />
              {priceable && (
                <input
                  className="field w-28"
                  type="number"
                  min="0"
                  step="1"
                  value={(draft.price_centavos ?? 0) / 100}
                  disabled={!isEditing}
                  onChange={(event) =>
                    updateDraft(item.id, {
                      price_centavos: Math.round(Number(event.target.value) * 100),
                    })
                  }
                />
              )}
              {table === "products" && (
                <textarea
                  className="field w-full min-h-20"
                  value={draft.description ?? ""}
                  disabled={!isEditing}
                  maxLength={500}
                  placeholder="Drink description"
                  onChange={(event) => updateDraft(item.id, { description: event.target.value })}
                />
              )}
              {table === "products" && (
                <div className="flex w-full items-center gap-3">
                  {draft.image_url && (
                    <button
                      type="button"
                      className="btn secondary !min-h-10 !px-3"
                      disabled={!isEditing}
                      onClick={() => updateDraft(item.id, { image_url: null })}
                    >
                      Remove image
                    </button>
                  )}
                  {!draft.image_url && (
                    <p className="text-sm text-[var(--color-muted)]">No image uploaded.</p>
                  )}
                </div>
              )}
              {table === "products" && isEditing && (
                <ProductImageUploader
                  productId={item.id}
                  currentUrl={draft.image_url}
                  onUploaded={async (image_url) => {
                    updateDraft(item.id, { image_url });
                  }}
                />
              )}
              <button
                type="button"
                className="btn secondary !min-h-10 !px-3"
                onClick={() => (isEditing ? void saveDraft() : setEditing(item.id))}
              >
                {isEditing ? "Save changes" : "Edit"}
              </button>
              <button
                type="button"
                className="btn secondary !min-h-10 !px-3"
                disabled={!isEditing}
                onClick={() =>
                  updateDraft(item.id, { is_available: !(draft.is_available ?? false) })
                }
              >
                {draft.is_available ? "Disable" : "Enable"}
              </button>
              {priceable && (
                <span className="text-sm font-bold">{formatPeso(item.price_centavos ?? 0)}</span>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
