import { useParams } from "wouter";
import { useState, useRef, useEffect } from "react";
import { useGetThread, useSendMessage, getGetThreadQueryKey, getListThreadsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout, ProtectedRoute, BreadcrumbNav } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Send, AlertTriangle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const PHONE_PATTERN = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const CIRCUMVENTION_KEYWORDS = /\b(cash\s*app|venmo|zelle|paypal|cashapp|whatsapp|telegram|snapchat)\b/i;

function containsContactInfo(text: string): boolean {
  return PHONE_PATTERN.test(text) || CIRCUMVENTION_KEYWORDS.test(text);
}

export default function ThreadPage() {
  const params = useParams<{ jobId: string; otherUserId: string }>();
  const jobId = parseInt(params.jobId ?? "0", 10);
  const otherUserId = parseInt(params.otherUserId ?? "0", 10);
  const [messageText, setMessageText] = useState("");
  const [showWarning, setShowWarning] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userStr = localStorage.getItem("bidwrenx_user");
  const currentUser = userStr ? JSON.parse(userStr) : null;

  const { data: messages, isLoading } = useGetThread(jobId, otherUserId, {
    query: {
      enabled: !!jobId && !!otherUserId,
      queryKey: getGetThreadQueryKey(jobId, otherUserId),
      refetchInterval: 5000,
    }
  });

  const sendMessage = useSendMessage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (val: string) => {
    setMessageText(val);
    setShowWarning(containsContactInfo(val));
  };

  const handleSend = () => {
    const trimmed = messageText.trim();
    if (!trimmed) return;

    sendMessage.mutate(
      { data: { jobId, recipientId: otherUserId, content: trimmed } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetThreadQueryKey(jobId, otherUserId) });
          queryClient.invalidateQueries({ queryKey: getListThreadsQueryKey() });
          setMessageText("");
          setShowWarning(false);
        },
        onError: (err: any) => {
          if (err?.data?.error === "circumvention_detected") {
            toast({
              title: "Message blocked",
              description: err?.data?.message ?? "For your safety, keep communication on BidWrenx until the job is accepted.",
              variant: "destructive",
            });
          } else {
            toast({ title: "Failed to send message", variant: "destructive" });
          }
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <BreadcrumbNav items={[{ label: "Messages", href: "/messages" }, { label: "Thread" }]} />

        {/* Safety reminder */}
        <div className="flex items-start gap-2 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 text-xs text-blue-300 mb-4">
          <ShieldAlert size={12} className="mt-0.5 shrink-0" />
          <span>
            <strong>Stay safe:</strong> For your protection, keep communication and payments on BidWrenx until the job is accepted. Sharing contact info before acceptance violates our terms.
          </span>
        </div>

        <div className="flex flex-col h-[calc(100vh-16rem)] rounded-xl border border-border bg-card overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border">
            <p className="font-semibold text-sm">Conversation about Job #{jobId}</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : !messages?.length ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.senderId === currentUser?.id;
                return (
                  <div key={msg.id} data-testid={`message-${msg.id}`} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-xs md:max-w-md rounded-2xl px-4 py-2.5 text-sm",
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    )}>
                      {!isMine && (
                        <p className="text-xs font-semibold mb-1 opacity-70">{msg.senderName}</p>
                      )}
                      <p className="leading-relaxed">{msg.content}</p>
                      <p className={cn("text-xs mt-1", isMine ? "opacity-60" : "text-muted-foreground")}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Warning */}
          {showWarning && (
            <div className="mx-4 mb-2 flex items-start gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-300">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>
                <strong>Warning:</strong> Your message appears to contain contact information or payment app references. For your safety and account protection, keep communication and payments on BidWrenx until the job is accepted. This message will be blocked.
              </span>
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t border-border flex gap-2">
            <Input
              placeholder="Type a message..."
              value={messageText}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              data-testid="input-message"
              className={cn("flex-1", showWarning && "border-red-500/50 focus-visible:ring-red-500/30")}
            />
            <Button
              onClick={handleSend}
              disabled={!messageText.trim() || sendMessage.isPending || showWarning}
              size="icon"
              data-testid="button-send-message"
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
