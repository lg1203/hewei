"use client";

import { Save, Settings2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageLoading } from "@/components/ui/Spinner";
import { putJson } from "@/lib/api";
import { useApi } from "@/lib/useApi";

type ConfigResponse = {
  config: {
    platform_name: string;
    points_earn_rate: string;
    points_redeem_rate: string;
    max_points_ratio: string;
  };
};

export default function AdminSettingsPage() {
  const { data, loading, refresh } = useApi<ConfigResponse>("/api/admin/settings");
  const [form, setForm] = useState({
    platform_name: "",
    points_earn_rate: "1",
    points_redeem_rate: "100",
    max_points_ratio: "50"
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.config) {
      setForm({
        platform_name: data.config.platform_name,
        points_earn_rate: data.config.points_earn_rate,
        points_redeem_rate: data.config.points_redeem_rate,
        max_points_ratio: data.config.max_points_ratio
      });
    }
  }, [data]);

  async function save() {
    setSaving(true);
    try {
      await putJson("/api/admin/settings", form);
      toast.success("平台设置已保存");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoading label="正在加载平台设置" />;

  return (
    <div>
      <PageHeader
        title="平台设置"
        description="配置平台名称与默认积分规则，商户可在自己的店铺设置中覆盖积分比例。"
        action={
          <Button onClick={save} loading={saving}>
            <Save className="h-4 w-4" />
            保存设置
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-brand-500" />
              基础配置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="平台名称">
              <Input
                value={form.platform_name}
                onChange={(e) =>
                  setForm({ ...form, platform_name: e.target.value })
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="消费积分比例"
                hint="每消费 1 元获得的积分数，默认 1"
              >
                <Input
                  type="number"
                  min="0"
                  value={form.points_earn_rate}
                  onChange={(e) =>
                    setForm({ ...form, points_earn_rate: e.target.value })
                  }
                />
              </Field>
              <Field
                label="积分抵扣比例"
                hint="多少积分抵 1 元，默认 100"
              >
                <Input
                  type="number"
                  min="1"
                  value={form.points_redeem_rate}
                  onChange={(e) =>
                    setForm({ ...form, points_redeem_rate: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field
              label="单笔最高积分抵扣比例（%）"
              hint="限制积分最多抵扣订单金额的比例，默认 50%"
            >
              <Input
                type="number"
                min="0"
                max="100"
                value={form.max_points_ratio}
                onChange={(e) =>
                  setForm({ ...form, max_points_ratio: e.target.value })
                }
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              规则示例
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-ink-600">
            <p>
              用户消费 <span className="font-semibold text-ink-900">100 元</span>
              ，可获得{" "}
              <span className="font-semibold text-brand-600">
                {Number(form.points_earn_rate || 0) * 100} 积分
              </span>
              。
            </p>
            <p>
              结账时最多可使用{" "}
              <span className="font-semibold text-violet-600">
                {Math.floor(
                  (100 * Number(form.max_points_ratio || 0)) / 100
                )}{" "}
                元
              </span>{" "}
              的积分抵扣，即{" "}
              {Math.floor(
                ((100 * Number(form.max_points_ratio || 0)) / 100) *
                  Number(form.points_redeem_rate || 0)
              )}{" "}
              积分。
            </p>
            <div className="rounded-xl bg-ink-50 p-3 text-xs text-ink-500">
              提示：积分规则会应用到新创建的订单，历史订单不受影响。商户可在「店铺设置」中覆盖平台默认值。
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
