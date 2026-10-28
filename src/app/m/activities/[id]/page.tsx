"use client";

import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  Megaphone
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoading } from "@/components/ui/Spinner";
import { formatDate } from "@/lib/utils";
import { useApi } from "@/lib/useApi";

type Activity = {
  id: string;
  title: string;
  subtitle: string;
  content: string;
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

const ctaClass =
  "mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 text-sm font-medium text-white shadow-sm transition active:bg-brand-600";

export default function MobileActivityDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useApi<{ activity: Activity }>(
    id ? `/api/public/activities/${id}` : null
  );
  const activity = data?.activity;
  const external = Boolean(activity?.link && /^https?:\/\//.test(activity.link));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/95 backdrop-blur">
        <div className="flex h-14 items-center px-3">
          <button
            onClick={() => router.push("/m/activities")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500"
            aria-label="返回"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="ml-1 text-sm font-semibold text-ink-900">活动详情</p>
        </div>
      </header>

      {loading ? (
        <PageLoading label="正在加载活动详情" />
      ) : !activity ? (
        <div className="p-4">
          <div className="rounded-2xl bg-white shadow-card">
            <EmptyState
              icon={<Megaphone className="h-5 w-5" />}
              title="活动不存在或已结束"
              description={error || "该活动可能已下线，去看看其他活动吧"}
              action={
                <Link
                  href="/m/activities"
                  className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-medium text-white"
                >
                  返回活动中心
                </Link>
              }
            />
          </div>
        </div>
      ) : (
        <div>
          <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-brand-500 via-orange-400 to-amber-300">
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
                <Megaphone className="h-12 w-12" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink-900/35 to-transparent" />
          </div>

          <div className="p-4">
            <div className="rounded-2xl bg-white p-4 shadow-card">
              <h1 className="text-xl font-semibold leading-8 text-ink-900">
                {activity.title}
              </h1>
              {activity.subtitle ? (
                <p className="mt-1.5 text-sm leading-6 text-ink-500">
                  {activity.subtitle}
                </p>
              ) : null}
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-400">
                <CalendarDays className="h-3.5 w-3.5" />
                {activityPeriod(activity)}
              </p>
            </div>

            <div className="mt-3 rounded-2xl bg-white p-4 shadow-card">
              <p className="text-xs font-semibold text-ink-800">活动说明</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-ink-600">
                {activity.content || "活动详情待完善，欢迎到店咨询。"}
              </p>
            </div>

            {activity.link ? (
              external ? (
                <a
                  href={activity.link}
                  target="_blank"
                  rel="noreferrer"
                  className={ctaClass}
                >
                  立即参与
                  <ArrowRight className="h-4 w-4" />
                </a>
              ) : (
                <Link href={activity.link} className={ctaClass}>
                  立即参与
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )
            ) : null}

            <Link
              href="/m/activities"
              className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-white text-sm font-medium text-ink-500 shadow-card"
            >
              查看全部活动
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
