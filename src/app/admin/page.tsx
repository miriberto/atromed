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
  cover_image: string | null;
  description: string | null;
  sort_order: number;
};

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");

  const [products, setProducts] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedPreviews, setSelectedPreviews] = useState<string[]>([]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    size: "",
    stock: "Var",
    amount: 0,
    images: [] as string[],
    cover_image: "",
  });

  useEffect(() => {
    const urls = selectedFiles.map((file) => URL.createObjectURL(file));
    setSelectedPreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedFiles]);

  async function getProducts() {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (data) setProducts(data);
  }

  useEffect(() => {
    if (authorized) getProducts();
  }, [authorized]);

  function moveArrayItem<T>(array: T[], index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= array.length) return array;

    const newArray = [...array];
    [newArray[index], newArray[targetIndex]] = [
      newArray[targetIndex],
      newArray[index],
    ];

    return newArray;
  }

  function moveExistingImage(index: number, direction: "up" | "down") {
    setForm({
      ...form,
      images: moveArrayItem(form.images, index, direction),
    });
  }

  function moveSelectedFile(index: number, direction: "up" | "down") {
    setSelectedFiles(moveArrayItem(selectedFiles, index, direction));
  }

  function removeSelectedFile(index: number) {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  }

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

    const uploadedImages = await uploadImages();
    const allImages = [...form.images, ...uploadedImages];

    const nextSortOrder =
      products.length > 0
        ? Math.max(...products.map((product) => product.sort_order || 0)) + 1
        : 1;

    const productData = {
      name: form.name,
      description: form.description,
      category: form.category,
      size: form.size,
      stock: form.stock,
      amount: form.amount,
      images: allImages,
      cover_image: form.cover_image || allImages[0] || null,
      ...(!editingId ? { sort_order: nextSortOrder } : {}),
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
      description: "",
      category: "",
      size: "",
      stock: "Var",
      amount: 0,
      images: [],
      cover_image: "",
    });

    getProducts();
  }

  function editProduct(product: Product) {
    setEditingId(product.id);

    setForm({
      name: product.name,
      description: product.description || "",
      category: product.category,
      size: product.size,
      stock: product.stock,
      amount: product.amount,
      images: product.images || [],
      cover_image: product.cover_image || "",
    });

    setSelectedFiles([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

    const updatedImages = form.images.filter((_, i) => i !== index);

    setForm({
      ...form,
      images: updatedImages,
      cover_image:
        form.cover_image === imageUrl ? updatedImages[0] || "" : form.cover_image,
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

      await supabase.storage.from("product-images").remove([filePath]);
    }

    await supabase.from("products").delete().eq("id", product.id);
    getProducts();
  }

  async function moveProduct(product: Product, direction: "up" | "down") {
    const sortedProducts = [...products].sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
    );

    const currentIndex = sortedProducts.findIndex((p) => p.id === product.id);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= sortedProducts.length) return;

    const currentProduct = sortedProducts[currentIndex];
    const targetProduct = sortedProducts[targetIndex];

    await supabase
      .from("products")
      .update({ sort_order: targetProduct.sort_order })
      .eq("id", currentProduct.id);

    await supabase
      .from("products")
      .update({ sort_order: currentProduct.sort_order })
      .eq("id", targetProduct.id);

    getProducts();
  }

  async function updateProductOrder(product: Product, value: number) {
    await supabase
      .from("products")
      .update({ sort_order: value })
      .eq("id", product.id);

    getProducts();
  }

  function cancelEdit() {
    setEditingId(null);
    setSelectedFiles([]);
    setForm({
      name: "",
      description: "",
      category: "",
      size: "",
      stock: "Var",
      amount: 0,
      images: [],
      cover_image: "",
    });
  }

  if (!authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-gray-900">Admin Girişi</h1>

          <input
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-5 w-full rounded-xl border p-3"
          />

          <button
            onClick={() => {
              if (password === ADMIN_PASSWORD) setAuthorized(true);
              else alert("Şifre yanlış");
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
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-2xl bg-white p-5 shadow">
          <h1 className="text-3xl font-bold text-gray-900">
            Atromed Admin Paneli
          </h1>
          <p className="mt-2 text-gray-600">
            Ürünleri, açıklamaları, sıralamaları ve kapak görsellerini yönet.
          </p>
        </div>

        <div className="mb-6 grid gap-4 rounded-2xl bg-white p-5 shadow">
          <input
            className="rounded-xl border p-3"
            placeholder="Ürün adı"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <textarea
            className="min-h-28 rounded-xl border p-3"
            placeholder="Ürün açıklaması (isteğe bağlı)"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />

          <select
            className="rounded-xl border p-3"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
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
            onChange={(e) => setForm({ ...form, size: e.target.value })}
          />

          <select
            className="rounded-xl border p-3"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
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
              setForm({ ...form, amount: Number(e.target.value) })
            }
          />

          {form.images.length > 0 && (
            <div>
              <h3 className="mb-3 font-bold text-gray-900">Mevcut Fotoğraflar</h3>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {form.images.map((image, index) => (
                  <div key={`${image}-${index}`} className="rounded-xl border">
                    <img
                      src={image}
                      alt=""
                      className="h-28 w-full rounded-t-xl object-cover"
                    />

                    {form.cover_image === image && (
                      <div className="bg-blue-600 py-1 text-center text-xs font-bold text-white">
                        Kapak Fotoğrafı
                      </div>
                    )}

                    <div className="grid gap-1 p-2">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, cover_image: image })}
                        className="rounded bg-blue-600 py-1 text-xs font-bold text-white"
                      >
                        Kapak Yap
                      </button>

                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => moveExistingImage(index, "up")}
                          className="rounded bg-gray-700 py-1 text-xs font-bold text-white"
                        >
                          ←
                        </button>

                        <button
                          type="button"
                          onClick={() => moveExistingImage(index, "down")}
                          className="rounded bg-gray-700 py-1 text-xs font-bold text-white"
                        >
                          →
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeExistingImage(index)}
                        className="rounded bg-red-600 py-1 text-xs font-bold text-white"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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

          {selectedPreviews.length > 0 && (
            <div>
              <h3 className="mb-3 font-bold text-gray-900">Yeni Fotoğraflar</h3>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {selectedPreviews.map((image, index) => (
                  <div key={image} className="rounded-xl border">
                    <img
                      src={image}
                      alt=""
                      className="h-28 w-full rounded-t-xl object-cover"
                    />

                    <div className="grid gap-1 p-2">
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => moveSelectedFile(index, "up")}
                          className="rounded bg-gray-700 py-1 text-xs font-bold text-white"
                        >
                          ←
                        </button>

                        <button
                          type="button"
                          onClick={() => moveSelectedFile(index, "down")}
                          className="rounded bg-gray-700 py-1 text-xs font-bold text-white"
                        >
                          →
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeSelectedFile(index)}
                        className="rounded bg-red-600 py-1 text-xs font-bold text-white"
                      >
                        Kaldır
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={addOrUpdateProduct}
              disabled={uploading}
              className="rounded-xl bg-blue-600 p-3 font-bold text-white disabled:opacity-50"
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

                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        defaultValue={product.sort_order || 0}
                        onBlur={(e) =>
                          updateProductOrder(product, Number(e.target.value))
                        }
                        className="w-24 rounded-lg border p-2"
                      />
                      <span className="text-sm text-gray-500">Sıra</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => moveProduct(product, "up")}
                      className="rounded-lg bg-gray-700 px-3 py-2 font-semibold text-white"
                    >
                      ↑
                    </button>

                    <button
                      onClick={() => moveProduct(product, "down")}
                      className="rounded-lg bg-gray-700 px-3 py-2 font-semibold text-white"
                    >
                      ↓
                    </button>

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

                <div className="mt-4 flex gap-2 overflow-x-auto">
                  {product.images?.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt=""
                        className={`h-20 w-20 rounded-lg object-cover ${
                          product.cover_image === image
                            ? "ring-4 ring-blue-500"
                            : ""
                        }`}
                      />

                      {product.cover_image === image && (
                        <div className="absolute bottom-1 left-1 rounded bg-blue-600 px-1 text-[10px] font-bold text-white">
                          Kapak
                        </div>
                      )}
                    </div>
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