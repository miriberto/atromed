"use client";

import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  category: string;
  size: string;
  stock: string;
  amount: number;
  images: string[];
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tümü");

  async function getProducts() {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setProducts(data);
    }
  }

  useEffect(() => {
    getProducts();
  }, []);

  const filteredProducts = products.filter((product) => {
    const nameMatches = product.name
      .toLowerCase()
      .includes(searchText.toLowerCase());

    const categoryMatches =
      selectedCategory === "Tümü" || product.category === selectedCategory;

    return nameMatches && categoryMatches;
  });

  return (
    <main className="min-h-screen bg-gray-100 px-3 py-4 sm:px-6">
      <section className="mx-auto max-w-6xl">
        <div className="mb-5 rounded-2xl bg-white p-5 shadow sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Atromed Medikal Ürün Kataloğu
          </h1>

          <p className="mt-2 text-sm text-gray-600 sm:text-base">
            Ürüne tıklayıp detay fotoğraflarını görebilirsin.
          </p>
        </div>

        <div className="mb-5 rounded-2xl bg-white p-4 shadow sm:p-5">
          <input
            type="text"
            placeholder="Ürün adına göre ara..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {["Tümü", "Travma", "Artroplasti", "Artroskopi"].map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  selectedCategory === category
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow">
            <h2 className="text-xl font-bold text-gray-900">
              Ürün bulunamadı
            </h2>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => {
              const previewImage = product.images?.[0] || "/foto1.jpg";

              return (
                <Link
                  href={`/urun/${product.id}`}
                  key={product.id}
                  className="overflow-hidden rounded-2xl bg-white shadow transition active:scale-[0.98] sm:hover:scale-[1.02] sm:hover:shadow-lg"
                >
                  <div className="relative h-52 w-full bg-gray-200 sm:h-48">
                    <Image
                      src={previewImage}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p
                        className={`rounded-full px-3 py-1 text-sm font-bold ${
                          product.category === "Travma"
                            ? "bg-blue-100 text-blue-800"
                            : product.category === "Artroplasti"
                            ? "bg-purple-100 text-purple-700"
                            : product.category === "Artroskopi"
                            ? "bg-cyan-100 text-cyan-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {product.category}
                      </p>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold sm:text-sm ${
                          product.stock === "Var"
                            ? "bg-green-100 text-green-700"
                            : product.stock === "Az kaldı"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {product.stock}
                      </span>
                    </div>

                    <h2 className="mt-1 text-lg font-bold text-gray-900 sm:text-xl">
                      {product.name}
                    </h2>

                    <p className="mt-1 text-sm text-gray-600">
                      {product.size}
                    </p>

                    {product.amount !== -1 && (
                      <p className="mt-4 text-sm text-gray-600">
                        Adet: {product.amount}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}