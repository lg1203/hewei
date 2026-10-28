"use client";

import {
  ChefHat,
  CircleOff,
  FolderPlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  Boxes
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageLoading } from "@/components/ui/Spinner";
import { deleteJson, patchJson, postJson, putJson } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import { useApi } from "@/lib/useApi";

type Category = { id: string; name: string; sort: number; _count?: { dishes: number } };

type Dish = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  status: string;
  categoryId: string | null;
  category: Category | null;
  defaultQty: number;
  sort: number;
  isRequired: boolean;
  totalQty: number;
  soldQty: number;
  remaining: number;
  soldOut: boolean;
};

type DishesResponse = { categories: Category[]; dishes: Dish[] };

const emptyDish = {
  name: "",
  categoryId: "",
  price: "",
  description: "",
  image: "",
  defaultQty: "50",
  sort: "0",
  isRequired: false
};

export default function MerchantDishesPage() {
  const { data, loading, refresh } = useApi<DishesResponse>(
    "/api/merchant/dishes"
  );
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [q, setQ] = useState("");
  const [dishOpen, setDishOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [stockTarget, setStockTarget] = useState<Dish | null>(null);
  const [editing, setEditing] = useState<Dish | null>(null);
  const [form, setForm] = useState(emptyDish);
  const [stock, setStock] = useState("0");
  const [newCategory, setNewCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const categories = data?.categories || [];
  const dishes = useMemo(() => {
    let list = data?.dishes || [];
    if (activeCategory !== "ALL") {
      list = list.filter((d) => d.categoryId === activeCategory);
    }
    if (q.trim()) {
      const keyword = q.trim().toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(keyword) ||
          d.description.toLowerCase().includes(keyword)
      );
    }
    return list;
  }, [data, activeCategory, q]);

  const stats = useMemo(() => {
    const list = data?.dishes || [];
    return {
      total: list.length,
      soldOut: list.filter((d) => d.soldOut && d.status === "ACTIVE").length,
      low: list.filter(
        (d) => d.status === "ACTIVE" && !d.soldOut && d.remaining <= 5
      ).length
    };
  }, [data]);

  function openCreate() {
    setEditing(null);
    setForm(emptyDish);
    setDishOpen(true);
  }

  function openEdit(dish: Dish) {
    setEditing(dish);
    setForm({
      name: dish.name,
      categoryId: dish.categoryId || "",
      price: (dish.price / 100).toFixed(2),
      description: dish.description,
      image: dish.image,
      defaultQty: String(dish.defaultQty),
      sort: String(dish.sort),
      isRequired: Boolean(dish.isRequired)
    });
    setDishOpen(true);
  }

  async function saveDish(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        categoryId: form.categoryId || null,
        price: Math.round(Number(form.price) * 100),
        description: form.description,
        image: form.image,
        defaultQty: Number(form.defaultQty || 0),
        sort: Number(form.sort || 0),
        isRequired: form.isRequired
      };
      if (editing) {
        await patchJson(`/api/merchant/dishes/${editing.id}`, payload);
        toast.success("菜品已更新");
      } else {
        await postJson("/api/merchant/dishes", payload);
        toast.success("菜品已添加");
      }
      setDishOpen(false);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function saveStock() {
    if (!stockTarget) return;
    setSaving(true);
    try {
      await putJson(`/api/merchant/dishes/${stockTarget.id}/stock`, {
        totalQty: Number(stock)
      });
      toast.success("今日库存已更新");
      setStockTarget(null);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "更新失败");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(dish: Dish) {
    try {
      await patchJson(`/api/merchant/dishes/${dish.id}`, {
        status: dish.status === "ACTIVE" ? "DISABLED" : "ACTIVE"
      });
      toast.success(dish.status === "ACTIVE" ? "菜品已下架" : "菜品已上架");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    }
  }

  async function addCategory() {
    if (!newCategory.trim()) return;
    try {
      await postJson("/api/merchant/categories", { name: newCategory.trim() });
      toast.success("分类已添加");
      setNewCategory("");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "添加失败");
    }
  }

  async function removeCategory(category: Category) {
    if (!window.confirm(`确定删除分类「${category.name}」吗？`)) return;
    try {
      await deleteJson(`/api/merchant/categories/${category.id}`);
      toast.success("分类已删除");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    }
  }

  if (loading) return <PageLoading label="正在加载菜品" />;

  return (
    <div>
      <PageHeader
        title="菜品与库存"
        description="管理菜品分类、价格与今日可售数量，售完自动显示售罄。"
        action={
          <>
            <Button variant="outline" onClick={() => setCategoryOpen(true)}>
              <FolderPlus className="h-4 w-4" />
              分类管理
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              新增菜品
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs text-ink-500">在售菜品</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900">{stats.total}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-ink-500">今日售罄</p>
          <p className="mt-2 text-2xl font-semibold text-rose-500">{stats.soldOut}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-ink-500">库存预警</p>
          <p className="mt-2 text-2xl font-semibold text-amber-500">{stats.low}</p>
        </Card>
      </div>

      <Card className="mt-5">
        <CardContent className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-ink-50 p-1">
              <button
                onClick={() => setActiveCategory("ALL")}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activeCategory === "ALL"
                    ? "bg-white text-ink-900 shadow-sm"
                    : "text-ink-500 hover:text-ink-800"
                }`}
              >
                全部
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    activeCategory === c.id
                      ? "bg-white text-ink-900 shadow-sm"
                      : "text-ink-500 hover:text-ink-800"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <div className="relative w-full lg:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜索菜品"
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {dishes.length ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {dishes.map((dish) => {
            const percent = dish.totalQty
              ? Math.min(100, (dish.soldQty / dish.totalQty) * 100)
              : 100;
            const inactive = dish.status !== "ACTIVE";
            return (
              <Card
                key={dish.id}
                className={`overflow-hidden transition hover:shadow-float ${
                  inactive ? "opacity-60" : ""
                }`}
              >
                <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-brand-100 to-ink-100">
                  {dish.image ? (
                    <img
                      src={dish.image}
                      alt={dish.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-900/35 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white drop-shadow">
                        {dish.name}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-white/75">
                        <span>{dish.category?.name || "未分类"}</span>
                        {dish.isRequired ? (
                          <span className="rounded bg-amber-300 px-1 py-0.5 text-[9px] font-semibold text-ink-900">
                            必点
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <span className="rounded-lg bg-white/90 px-2 py-1 text-xs font-semibold text-ink-900 backdrop-blur">
                      {formatMoney(dish.price)}
                    </span>
                  </div>
                  {dish.soldOut ? (
                    <div className="absolute right-3 top-3 rounded-full bg-ink-900/80 px-2.5 py-1 text-[11px] font-medium text-white">
                      今日售罄
                    </div>
                  ) : null}
                  {inactive ? (
                    <div className="absolute left-3 top-3 rounded-full bg-ink-900/80 px-2.5 py-1 text-[11px] font-medium text-white">
                      已下架
                    </div>
                  ) : null}
                </div>
                <CardContent className="space-y-3 p-4">
                  <p className="line-clamp-2 min-h-[36px] text-xs leading-5 text-ink-500">
                    {dish.description || "暂无菜品描述"}
                  </p>
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-ink-400">
                      <span>
                        今日已售 {dish.soldQty} / {dish.totalQty}
                      </span>
                      <span
                        className={
                          dish.soldOut
                            ? "font-medium text-rose-500"
                            : dish.remaining <= 5
                              ? "font-medium text-amber-500"
                              : ""
                        }
                      >
                        {dish.soldOut ? "售罄" : `剩 ${dish.remaining} 份`}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className={`h-full rounded-full ${
                          dish.soldOut
                            ? "bg-rose-400"
                            : dish.remaining <= 5
                              ? "bg-amber-400"
                              : "bg-brand-400"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setStockTarget(dish);
                        setStock(String(dish.totalQty));
                      }}
                    >
                      <Boxes className="h-3.5 w-3.5" />
                      库存
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEdit(dish)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={
                        inactive
                          ? "text-emerald-500 hover:bg-emerald-50"
                          : "text-ink-400 hover:bg-rose-50 hover:text-rose-500"
                      }
                      onClick={() => toggleStatus(dish)}
                      aria-label={inactive ? "上架" : "下架"}
                    >
                      <CircleOff className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="mt-5">
          <EmptyState
            icon={<ChefHat className="h-5 w-5" />}
            title="还没有菜品"
            description="添加第一道菜，设置价格和今日库存"
            action={<Button onClick={openCreate}>新增菜品</Button>}
          />
        </Card>
      )}

      <Modal
        open={dishOpen}
        onClose={() => setDishOpen(false)}
        title={editing ? "编辑菜品" : "新增菜品"}
        description="价格按元填写；今日库存可在菜品卡片中单独调整。"
        className="max-w-2xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setDishOpen(false)}>
              取消
            </Button>
            <Button form="dish-form" type="submit" loading={saving}>
              保存
            </Button>
          </>
        }
      >
        <form id="dish-form" onSubmit={saveDish} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="菜品名称">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="如：外婆红烧肉"
                required
              />
            </Field>
            <Field label="所属分类">
              <Select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              >
                <option value="">未分类</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="价格（元）">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </Field>
            <Field label="默认日库存">
              <Input
                type="number"
                min="0"
                value={form.defaultQty}
                onChange={(e) => setForm({ ...form, defaultQty: e.target.value })}
              />
            </Field>
            <Field label="排序">
              <Input
                type="number"
                value={form.sort}
                onChange={(e) => setForm({ ...form, sort: e.target.value })}
              />
            </Field>
          </div>
          <label className="flex items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50/60 px-3.5 py-3 text-xs text-ink-600">
            <input
              type="checkbox"
              checked={form.isRequired}
              onChange={(e) =>
                setForm({ ...form, isRequired: e.target.checked })
              }
              className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-500"
            />
            <span>
              <span className="font-medium text-ink-800">设为必点菜</span>
              <span className="mt-0.5 block text-[11px] leading-5 text-ink-500">
                同一用餐会话至少点 1 份必点菜才能下单和结账，会员赠饮不计入必点数量。
              </span>
            </span>
          </label>
          <Field label="菜品描述">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="口味、食材、份量等"
            />
          </Field>
          <Field label="图片地址" hint="可填写公开图片 URL，留空则显示渐变占位图">
            <Input
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              placeholder="https://..."
            />
          </Field>
          {form.image ? (
            <div className="h-28 w-full overflow-hidden rounded-xl bg-ink-100">
              <img
                src={form.image}
                alt="预览"
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={Boolean(stockTarget)}
        onClose={() => setStockTarget(null)}
        title="调整今日库存"
        description={
          stockTarget
            ? `${stockTarget.name} · 今日已售 ${stockTarget.soldQty} 份`
            : ""
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setStockTarget(null)}>
              取消
            </Button>
            <Button onClick={saveStock} loading={saving}>
              保存库存
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="今日可售总数量" hint="售完自动在用户端显示售罄">
            <Input
              type="number"
              min={stockTarget?.soldQty || 0}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </Field>
          <div className="rounded-xl bg-ink-50 px-3 py-2.5 text-xs text-ink-500">
            已售 {stockTarget?.soldQty || 0} 份，设置后剩余{" "}
            {Math.max(0, Number(stock || 0) - (stockTarget?.soldQty || 0))} 份。
          </div>
        </div>
      </Modal>

      <Modal
        open={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        title="分类管理"
        description="分类会显示在用户点餐页面的左侧导航中。"
        footer={
          <Button variant="outline" onClick={() => setCategoryOpen(false)}>
            完成
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="新分类名称"
            />
            <Button onClick={addCategory}>
              <Plus className="h-4 w-4" />
              添加
            </Button>
          </div>
          <div className="divide-y divide-ink-100 rounded-xl border border-ink-100">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-ink-800">{c.name}</p>
                  <p className="text-[11px] text-ink-400">
                    {c._count?.dishes || 0} 道菜
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-ink-400 hover:bg-rose-50 hover:text-rose-500"
                  onClick={() => removeCategory(c)}
                  aria-label="删除分类"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
