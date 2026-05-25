"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

const ADMIN_PASSWORD = "250425";

type Product = {
  id: string;
  name: string;
  category: string;
  size: string;
  stock: string;
  amount: number;
  images: string[];
};

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");

  const [products, setProducts] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [form, setForm] = useState({
    name: "",
    category: "",
    size: "",
    stock: "Var",
    amount: 0,
    images: [] as string[],
  });

  async function getProducts() {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setProducts(data);
  }

  useEffect(() => {
    if (authorized) getProducts();
  }, [authorized]);

  async function uploadImages() {
    const imageUrls: string[] = [];

    for (const file of selectedFiles) {
      const fileName = `${Date.now()}-${file.name}`;

      const { error } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);

      if (error) continue;

      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      imageUrls.push(data.publicUrl);
    }

    return imageUrls;
  }

  async function addOrUpdateProduct() {
    if (!form.name || !form.category) {
      alert("Ürün adı ve kategori zorunlu");
      return;
    }

    setUploading(true);

    const newImages = await uploadImages();
    const allImages = [...form.images, ...newImages];

    const productData = {
      name: form.name,
      category: form.category,
      size: form.size,
      stock: form.stock,
      amount: form.amount,
      images: allImages,
    };

    const { error } = editingId
      ? await supabase.from("products").update(productData).eq("id", editingId)
      : await supabase.from("products").insert([productData]);

    setUploading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setEditingId(null);
    setSelectedFiles([]);

    setForm({
      name: "",
      category: "",
      size: "",
      stock: "Var",
      amount: 0,
      images: [],
    });

    getProducts();
  }

  function editProduct(product: Product) {
    setEditingId(product.id);

    setForm({
      name: product.name,
      category: product.category,
      size: product.size,
      stock: product.stock,
      amount: product.amount,
      images: product.images || [],
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function deleteProduct(product: Product) {
    const confirmDelete = confirm(
      `"${product.name}" ürünü ve fotoğrafları silinsin mi?`
    );

    if (!confirmDelete) return;

    for (const imageUrl of product.images || []) {
      const filePath = imageUrl.includes("/product-images/")
        ? decodeURIComponent(imageUrl.split("/product-images/")[1])
        : "";

      if (!filePath) continue;

      const { error } = await supabase.storage
        .from("product-images")
        .remove([filePath]);

      if (error) {
        console.error("Fotoğraf silinemedi:", error.message);
      }
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      alert(error.message);
      return;
    }

    getProducts();
  }

  async function removeExistingImage(index: number) {
  const imageUrl = form.images[index];

  const confirmDelete = confirm("Bu fotoğraf tamamen silinsin mi?");
  if (!confirmDelete) return;

  const filePath = imageUrl.includes("/product-images/")
    ? decodeURIComponent(imageUrl.split("/product-images/")[1])
    : "";

  if (filePath) {
    const { error } = await supabase.storage
      .from("product-images")
      .remove([filePath]);

    if (error) {
      alert("Fotoğraf Storage'dan silinemedi: " + error.message);
      return;
    }
  }

  setForm({
    ...form,
    images: form.images.filter((_, i) => i !== index),
  });
}

  function cancelEdit() {
    setEditingId(null);
    setSelectedFiles([]);

    setForm({
      name: "",
      category: "",
      size: "",
      stock: "Var",
      amount: 0,
      images: [],
    });
  }

  if (!authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-gray-900">Admin Girişi</h1>

          <p className="mt-2 text-gray-600">Devam etmek için şifre gir.</p>

          <input
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-5 w-full rounded-xl border p-3"
          />

          <button
            onClick={() => {
              if (password === ADMIN_PASSWORD) {
                setAuthorized(true);
              } else {
                alert("Şifre yanlış");
              }
            }}
            className="mt-4 w-full rounded-xl bg-blue-600 p-3 font-bold text-white"
          >
            Giriş Yap
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <section className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-2xl bg-white p-5 shadow">
          <h1 className="text-3xl font-bold text-gray-900">
            Supabase Admin Paneli
          </h1>

          <p className="mt-2 text-gray-600">
            Ürün ekle, düzenle, sil ve fotoğraf yükle.
          </p>
        </div>

        <div className="mb-6 grid gap-4 rounded-2xl bg-white p-5 shadow">
          <input
            className="rounded-xl border p-3"
            placeholder="Ürün adı"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
          />

          <select
            className="rounded-xl border p-3"
            value={form.category}
            onChange={(e) =>
              setForm({
                ...form,
                category: e.target.value,
              })
            }
          >
            <option value="">Kategori Seç</option>
            <option value="Travma">Travma</option>
            <option value="Artroplasti">Artroplasti</option>
            <option value="Artroskopi">Artroskopi</option>
          </select>

          <input
            className="rounded-xl border p-3"
            placeholder="Ölçü"
            value={form.size}
            onChange={(e) =>
              setForm({
                ...form,
                size: e.target.value,
              })
            }
          />

          <select
            className="rounded-xl border p-3"
            value={form.stock}
            onChange={(e) =>
              setForm({
                ...form,
                stock: e.target.value,
              })
            }
          >
            <option>Var</option>
            <option>Az kaldı</option>
            <option>Yok</option>
          </select>

          <input
            type="number"
            className="rounded-xl border p-3"
            placeholder="Adet (-1 gizler)"
            value={form.amount}
            onChange={(e) =>
              setForm({
                ...form,
                amount: Number(e.target.value),
              })
            }
          />

          {form.images.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {form.images.map((image, index) => (
                <div
                  key={`${image}-${index}`}
                  className="overflow-hidden rounded-xl border"
                >
                  <img src={image} alt="" className="h-28 w-full object-cover" />

                  <button
                    type="button"
                    onClick={() => removeExistingImage(index)}
                    className="w-full bg-red-600 py-2 text-sm font-bold text-white"
                  >
                    Fotoğrafı Kaldır
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            type="file"
            multiple
            accept="image/*"
            className="rounded-xl border bg-white p-3"
            onChange={(e) =>
              setSelectedFiles(Array.from(e.target.files || []))
            }
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={addOrUpdateProduct}
              disabled={uploading}
              className="rounded-xl bg-blue-600 p-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading
                ? "Yükleniyor..."
                : editingId
                ? "Ürünü Güncelle"
                : "Ürün Ekle"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-xl bg-gray-600 p-3 font-bold text-white"
              >
                Düzenlemeyi İptal Et
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Ürünler</h2>

          <div className="grid gap-4">
            {products.map((product) => (
              <div key={product.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {product.name}
                    </h3>

                    <p className="text-sm text-gray-600">
                      {product.category} | {product.size}
                    </p>

                    {product.amount !== -1 ? (
                      <p className="mt-1 text-sm text-gray-600">
                        {product.stock} | Adet: {product.amount}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-gray-600">
                        {product.stock}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => editProduct(product)}
                      className="rounded-lg bg-yellow-500 px-4 py-2 font-semibold text-white"
                    >
                      Düzenle
                    </button>

                    <button
                      onClick={() => deleteProduct(product)}
                      className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white"
                    >
                      Sil
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {product.images?.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt=""
                      className="h-28 w-full rounded-xl object-cover"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}