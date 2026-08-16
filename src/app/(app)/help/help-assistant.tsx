"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { askHelpAssistantAction, type HelpChatMessage } from "./actions";

const SUGGESTIONS = [
  "How is win rate calculated?",
  "What's the difference between Pro and Pro+?",
  "How do I import my broker CSV?",
];

export function HelpAssistant() {
  const [messages, setMessages] = useState<HelpChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  function send(text: string) {
    const question = text.trim();
    if (!question || pending) return;

    setError(null);
    setInput("");
    const nextMessages: HelpChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);

    startTransition(async () => {
      const result = await askHelpAssistantAction(messages, question);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setMessages([...nextMessages, { role: "assistant", content: result.reply }]);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" />
          Ask AI for extra help
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Ask anything about how Basis works — it only answers questions about the
              app itself, never trading or market advice.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-brand-gradient text-white"
                      : "border border-border bg-card"
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {pending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {error && <p className="text-sm text-loss">{error}</p>}

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask a question about Basis…"
            rows={1}
            className="max-h-32 min-h-0 resize-none py-2"
          />
          <Button type="submit" size="icon" disabled={pending || !input.trim()}>
            <Send className="size-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
