"use client";

import { Save, Settings2, Sparkles, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageLoading } from "@/components/ui/Spinner";
import { putJson } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import { useApi } from "@/lib/useApi";

type ShopResponse = {
  shop: {
    id: string;
    name: string;
    address: string;
    phone: string;
    description: string;
    announcement: string;
    businessHours: string;
    cover: string;
    status: string;
    pointsEarnRate: number;
    pointsRedeemRate: number;
    maxPointsRatio: number;
    _count: { dishes: number; tables: number; coupons: number };
  };
};

export default function MerchantSettingsPage() {
  const { data, loading, refresh } = useApi<ShopResponse>("/api/merchant/shop");
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    description: "",
    announcement: "",
    businessHours: "",
    cover: "",
    pointsEarnRate: "1",
    pointsRedeemRate: "100",
    maxPointsRatio: "50"
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.shop) {
      setForm({
        name: data.shop.name,
        address: data.shop.address,
        phone: data.shop.phone,
        description: data.shop.description,
        announcement: data.shop.announcement,
        businessHours: data.shop.businessHours,
        cover: data.shop.cover,
        pointsEarnRate: String(data.shop.pointsEarnRate),
        pointsRedeemRate: String(data.shop.pointsRedeemRate),
        maxPointsRatio: String(data.shop.maxPointsRatio)
      });
    }
  }, [data]);

  async function save() {
    setSaving(true);
    try {
      await putJson("/api/merchant/shop", {
        ...form,
        pointsEarnRate: Number(form.pointsEarnRate || 0),
        pointsRedeemRate: Number(form.pointsRedeemRate || 100),
        maxPointsRatio: Number(form.maxPointsRatio || 0)
      });
      toast.success("店铺设置已保存");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoading label="正在加载店铺设置" />;

  const shop = data?.shop;

  return (
    <div>
      <PageHeader
        title="店铺设置"
        description="维护门店展示信息、公告与会员积分规则。"
        action={
          <Button onClick={save} loading={saving}>
            <Save className="h-4 w-4" />
            保存设置
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-4 w-4 text-brand-500" />
                门店信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="门店名称">
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Field>
                <Field label="联系电话">
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="门店地址">
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="营业时间">
                  <Input
                    value={form.businessHours}
                    onChange={(e) =>
                      setForm({ ...form, businessHours: e.target.value })
                    }
                    placeholder="如：10:30-21:30"
                  />
                </Field>
                <Field label="封面图片地址" hint="可填写公开图片 URL">
                  <Input
                    value={form.cover}
                    onChange={(e) => setForm({ ...form, cover: e.target.value })}
                    placeholder="https://..."
                  />
                </Field>
              </div>
              <Field label="门店简介">
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="介绍门店特色、招牌菜系"
                />
              </Field>
              <Field label="店内公告" hint="会展示在商户首页与用户点餐页">
                <Textarea
                  value={form.announcement}
                  onChange={(e) =>
                    setForm({ ...form, announcement: e.target.value })
                  }
                  placeholder="如：今日新到千岛湖鲈鱼，数量有限"
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                会员积分规则
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="消费得积分" hint="每消费 1 元获得的积分">
                  <Input
                    type="number"
                    min="0"
                    value={form.pointsEarnRate}
                    onChange={(e) =>
                      setForm({ ...form, pointsEarnRate: e.target.value })
                    }
                  />
                </Field>
                <Field label="积分抵现比例" hint="多少积分抵 1 元">
                  <Input
                    type="number"
                    min="1"
                    value={form.pointsRedeemRate}
                    onChange={(e) =>
                      setForm({ ...form, pointsRedeemRate: e.target.value })
                    }
                  />
                </Field>
                <Field label="最高抵扣比例（%）" hint="单笔订单最多抵扣">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={form.maxPointsRatio}
                    onChange={(e) =>
                      setForm({ ...form, maxPointsRatio: e.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="rounded-xl bg-ink-50 px-4 py-3 text-xs leading-6 text-ink-500">
                按当前规则：消费 100 元可获得{" "}
                <span className="font-semibold text-brand-600">
                  {100 * Number(form.pointsEarnRate || 0)} 积分
                </span>
                ；结账时最多可用积分抵扣{" "}
                <span className="font-semibold text-violet-600">
                  {formatMoney(
                    Math.floor(
                      (10000 * Number(form.maxPointsRatio || 0)) / 100
                    )
                  )}
                </span>
                （约{" "}
                {Math.floor(
                  ((10000 * Number(form.maxPointsRatio || 0)) / 100) *
                    Number(form.pointsRedeemRate || 0) /
                    100
                )}{" "}
                积分）。
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-ink-400" />
                店铺概况
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-500">菜品数量</span>
                <span className="font-semibold text-ink-900">
                  {shop?._count.dishes || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">桌台数量</span>
                <span className="font-semibold text-ink-900">
                  {shop?._count.tables || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">优惠券数量</span>
                <span className="font-semibold text-ink-900">
                  {shop?._count.coupons || 0}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-ink-100 pt-3">
                <span className="text-ink-500">营业状态</span>
                <span className="font-semibold text-emerald-600">
                  {shop?.status === "ACTIVE" ? "营业中" : "已停业"}
                </span>
              </div>
            </CardContent>
          </Card>

          {form.cover ? (
            <Card className="overflow-hidden">
              <div className="h-36 w-full bg-gradient-to-br from-brand-100 to-ink-100">
                <img
                  src={form.cover}
                  alt="门店封面"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-ink-900">{form.name}</p>
                <p className="mt-1 text-xs text-ink-400">
                  {form.address || "未填写地址"}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
