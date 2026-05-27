import { Link } from "wouter";
import { useListThreads } from "@workspace/api-client-react";
import { AppLayout, PageHeader, ProtectedRoute, EmptyState } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Clock } from "lucide-react";

export default function MessagesPage() {
  const { data, isLoading } = useListThreads();

  return (
    <ProtectedRoute>
      <AppLayout>
        <PageHeader title="Messages" subtitle="Your conversations with customers and mechanics" />

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : !data?.length ? (
          <EmptyState
            icon={<MessageSquare size={48} />}
            title="No messages yet"
            description="Start a conversation from a job or bid page."
          />
        ) : (
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {data.map((thread) => (
              <Link key={`${thread.jobId}-${thread.otherUserId}`} href={`/messages/${thread.jobId}/${thread.otherUserId}`}>
                <div
                  data-testid={`thread-${thread.jobId}-${thread.otherUserId}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                    {thread.otherUserName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="font-medium text-sm">{thread.otherUserName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(thread.lastMessageAt).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{thread.jobTitle}</p>
                    <p className="text-xs text-foreground truncate mt-0.5">{thread.lastMessage}</p>
                  </div>
                  {thread.unreadCount > 0 && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
                      {thread.unreadCount}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </AppLayout>
    </ProtectedRoute>
  );
}
