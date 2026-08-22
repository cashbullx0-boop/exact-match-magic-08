import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Link } from "@tanstack/react-router";
import { Bot, LifeBuoy } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";

const SUGGESTIONS = [
  "Deposit kaise karun?",
  "Withdrawal kitni der me aata hai?",
  "Trade ke rules kya hain?",
  "Referral reward kaise milta hai?",
];

export function AiSupportChat({ className = "" }: { className?: string }) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (e) => setErrorMsg(e.message || "Something went wrong. Please try again."),
  });

  const busy = status === "submitted" || status === "streaming";

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    setErrorMsg(null);
    void sendMessage({ text: text.trim() });
  };

  const handleSubmit = (message: PromptInputMessage) => {
    send(message.text ?? "");
  };

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      <Conversation className="flex-1 min-h-0">
        <ConversationContent className="gap-3">
          {messages.length === 0 && (
            <div className="text-center py-6 space-y-3">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Bull — CashBullX AI assistant</p>
                <p className="text-xs text-muted-foreground">
                  Deposit, withdraw, trade, referral — kuch bhi poochein. 24/7 available.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-[11px] rounded-full border border-border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => {
            const text = m.parts
              .map((p) => (p.type === "text" ? p.text : ""))
              .join("");
            if (!text) return null;
            return (
              <Message from={m.role} key={m.id}>
                <MessageContent>
                  <MessageResponse>{text}</MessageResponse>
                </MessageContent>
              </Message>
            );
          })}

          {status === "submitted" && (
            <Shimmer className="text-xs">Bull is thinking...</Shimmer>
          )}

          {errorMsg && (
            <p className="text-xs text-red-400 px-1">{errorMsg}</p>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="pt-2 space-y-2">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea placeholder="Apna sawal likhein..." disabled={busy} />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={busy} />
          </PromptInputFooter>
        </PromptInput>
        <p className="text-[10px] text-muted-foreground text-center">
          Account-specific issue?{" "}
          <Link to="/support" className="text-primary inline-flex items-center gap-1">
            <LifeBuoy className="h-3 w-3" /> open a ticket
          </Link>
        </p>
      </div>
    </div>
  );
}
