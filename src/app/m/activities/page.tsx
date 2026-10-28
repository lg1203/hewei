"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Megaphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoading } from "@/components/ui/Spinner";
import { formatDate } from "@/lib/utils";
import { useApi } from "@/lib/useApi";

type Activity = {
  id: string;
  title: string;
  subtitle: string;
  poster: string;
  link: string;
  startAt: string | null;
  endAt: string | null;
};

function activityPeriod(activity: Activity) {
  if (!activity.startAt && !activity.endAt) return "长期有效";
  if (activity.startAt && activity.endAt) {
    return `${formatDate(activity.startAt)} ~ ${formatDate(activity.endAt)}`;
  }
  if (activity.startAt) return `${formatDate(activity.startAt)} 起`;
  return `至 ${formatDate(activity.endAt)}`;
}

export default function MobileActivitiesPage() {
  const router = useRouter();
  const { data, loading } = useApi<{ activities: Activity[] }>(
    "/api/public/activities"
  );
  const activities = data?.activities || [];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/95 backdrop-blur">
        <div className="flex h-14 items-center px-3">
          <button
            onClick={() => router.push("/m")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500"
            aria-label="返回"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="ml-1 text-sm font-semibold text-ink-900">活动中心</p>
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <PageLoading label="正在加载活动" />
        ) : activities.length ? (
          <div className="space-y-3">
            {activities.map((activity) => (
              <Link
                key={activity.id}
                href={`/m/activities/${activity.id}`}
                className="block overflow-hidden rounded-2xl bg-white shadow-card transition active:scale-[0.99]"
              >
                <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-brand-500 via-orange-400 to-amber-300">
                  {activity.poster ? (
                    <img
                      src={activity.poster}
                      alt={activity.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/70">
                      <Megaphone className="h-10 w-10" />
                    </div>
                  )}
                  <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-medium text-white backdrop-blur">
                    <Megaphone className="h-2.5 w-2.5" />
                    活动
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-ink-900">
                        {activity.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-500">
                        {activity.subtitle || "点击查看活动详情"}
                      </p>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-300" />
                  </div>
                  <p className="mt-3 flex items-center gap-1 text-[10px] text-ink-400">
                    <CalendarDays className="h-3 w-3" />
                    {activityPeriod(activity)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white shadow-card">
            <EmptyState
              icon={<Megaphone className="h-5 w-5" />}
              title="暂无活动"
              description="平台活动上线后会展示在这里"
            />
          </div>
        )}
      </div>
    </div>
  );
}
