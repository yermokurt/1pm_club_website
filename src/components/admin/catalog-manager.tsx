"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { formatPeso } from "@/lib/currency";
type RecordItem = {
  id: string;
  name: string;
  is_available?: boolean;
  price_centavos?: number;
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
  const save = async (id: string, values: Record<string, unknown>) => {
    const { error } = await createClient().from(table).update(values).eq("id", id);
    if (error) return setMessage("Could not save that change.");
    setRows((current) => current.map((item) => (item.id === id ? { ...item, ...values } : item)));
    setMessage("Saved.");
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
          if (table === "products") values.category_id = String(formData.get("category_id") ?? "");
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
        <button className="btn">Add</button>
      </form>
      {message && <p className="mt-3 text-sm">{message}</p>}
      <div className="grid gap-3 mt-5">
        {rows.map((item) => (
          <article className="card p-4 flex flex-wrap gap-3 items-center" key={item.id}>
            <input
              className="field flex-1 min-w-40"
              defaultValue={item.name}
              onBlur={(event) => {
                if (event.target.value.trim() && event.target.value !== item.name)
                  void save(item.id, { name: event.target.value.trim() });
              }}
            />
            {priceable && (
              <input
                className="field w-28"
                type="number"
                min="0"
                step="1"
                defaultValue={(item.price_centavos ?? 0) / 100}
                onBlur={(event) =>
                  void save(item.id, {
                    price_centavos: Math.round(Number(event.target.value) * 100),
                  })
                }
              />
            )}
            <button
              className="btn secondary !min-h-10 !px-3"
              onClick={() =>
                void save(item.id, {
                  is_available: !(item.is_available ?? false),
                })
              }
            >
              {item.is_available ? "Disable" : "Enable"}
            </button>
            {priceable && (
              <span className="text-sm font-bold">{formatPeso(item.price_centavos ?? 0)}</span>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
