import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  UserRoundCheck,
  ShieldCheck,
} from "lucide-react";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";

type Message = {
  id: string;
  role: "user" | "assistant" | "admin";
  body: string;
  quickActions?: string[];
};

type StoredGuestChat = {
  sessionId: string;
  guestToken: string;
  name: string;
  email: string;
};

const guestChatStorageKey = "ysello-admin-support-chat-v1";

export function SupportWidgetPro() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [guestToken, setGuestToken] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [handoffMessage, setHandoffMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guestReplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (guestReplyTimerRef.current) clearTimeout(guestReplyTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const closeDialog = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  const handleDialogKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [closeDialog],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!open || !user || sessionId) return;
    void apiRequest<{
      sessions: Array<{ id: string; status: string; messages: Message[] }>;
    }>("/api/nexus/chat/sessions")
      .then((data) => {
        const latest = data.sessions[0];
        if (!latest) return;
        setSessionId(latest.id);
        setMessages(latest.messages);
      })
      .catch(() => undefined);
  }, [open, sessionId, user]);

  useEffect(() => {
    if (!open || user || sessionId) return;
    const raw = window.localStorage.getItem(guestChatStorageKey);
    if (!raw) return;
    try {
      const stored = JSON.parse(raw) as StoredGuestChat;
      if (!stored.sessionId || !/^[a-f0-9]{64}$/i.test(stored.guestToken)) {
        window.localStorage.removeItem(guestChatStorageKey);
        return;
      }
      setSessionId(stored.sessionId);
      setGuestToken(stored.guestToken);
      setGuestName(stored.name);
      setGuestEmail(stored.email);
      void apiRequest<{ session: { messages: Message[] } }>(
        `/api/nexus/chat/guest/${stored.sessionId}`,
        { headers: { "x-guest-chat-token": stored.guestToken } },
        false,
      )
        .then((data) => setMessages(data.session.messages))
        .catch(() => {
          window.localStorage.removeItem(guestChatStorageKey);
          setSessionId(null);
          setGuestToken("");
          setMessages([]);
        });
    } catch {
      window.localStorage.removeItem(guestChatStorageKey);
    }
  }, [open, sessionId, user]);

  useEffect(() => {
    if (!open || !sessionId || (!user && !guestToken)) return;
    const refresh = async () => {
      if (user) {
        const data = await apiRequest<{
          sessions: Array<{ id: string; messages: Message[] }>;
        }>("/api/nexus/chat/sessions").catch(() => null);
        const session = data?.sessions.find((item) => item.id === sessionId);
        if (session) setMessages(session.messages);
        return;
      }
      const data = await apiRequest<{ session: { messages: Message[] } }>(
        `/api/nexus/chat/guest/${sessionId}`,
        { headers: { "x-guest-chat-token": guestToken } },
        false,
      ).catch(() => null);
      if (data) setMessages(data.session.messages);
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(timer);
  }, [guestToken, open, sessionId, user]);

  const debouncedTyping = useCallback(
    (isTyping: boolean) => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        if (user && sessionId) {
          void apiRequest("/api/nexus/live/typing", {
            method: "POST",
            body: { sessionId, isTyping },
          }).catch(() => undefined);
        }
      }, 300);
    },
    [sessionId, user],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      if (
        !user &&
        !sessionId &&
        (guestName.trim().length < 2 ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim()))
      ) {
        setHandoffMessage(
          "Enter your name and a valid email so the admin can identify your conversation.",
        );
        return;
      }
      setTyping(true);
      setHandoffMessage("");
      debouncedTyping(true);

      try {
        let message: Message;
        if (!user && sessionId && guestToken) {
          const result = await apiRequest<{ message: Message }>(
            `/api/nexus/chat/guest/${sessionId}/messages`,
            {
              method: "POST",
              headers: { "x-guest-chat-token": guestToken },
              body: { body: text.trim() },
            },
            false,
          );
          message = result.message;
        } else if (!user) {
          const result = await apiRequest<{
            sessionId: string;
            guestToken: string;
            session: { messages: Message[] };
          }>(
            "/api/nexus/chat/guest",
            {
              method: "POST",
              body: {
                name: guestName.trim(),
                email: guestEmail.trim(),
                message: text.trim(),
              },
            },
            false,
          );
          const stored: StoredGuestChat = {
            sessionId: result.sessionId,
            guestToken: result.guestToken,
            name: guestName.trim(),
            email: guestEmail.trim().toLowerCase(),
          };
          window.localStorage.setItem(
            guestChatStorageKey,
            JSON.stringify(stored),
          );
          setSessionId(result.sessionId);
          setGuestToken(result.guestToken);
          setMessages(result.session.messages);
          message = result.session.messages[result.session.messages.length - 1];
        } else if (sessionId) {
          const result = await apiRequest<{ message: Message }>(
            `/api/nexus/chat/${sessionId}/messages`,
            {
              method: "POST",
              body: { body: text.trim() },
            },
          );
          message = result.message;
        } else {
          const result = await apiRequest<{
            sessionId: string;
            chatMessage: Message;
          }>("/api/nexus/chat/human", {
            method: "POST",
            body: { message: text.trim() },
          });
          setSessionId(result.sessionId);
          message = result.chatMessage;
        }
        if (!(!user && !sessionId)) {
          setMessages((previous) => [...previous, message]);
        }
        setInput("");
        setHandoffMessage(
          "Sent to the admin inbox. Replies will appear here automatically.",
        );
      } catch {
        setHandoffMessage(
          "Your message could not be sent. Check your connection and try again.",
        );
      } finally {
        setTyping(false);
        debouncedTyping(false);
      }
    },
    [debouncedTyping, guestEmail, guestName, guestToken, sessionId, user],
  );

  const requestHuman = useCallback(() => {
    setHandoffMessage(
      sessionId
        ? "Admin chat is active. Replies will appear here automatically."
        : "Write a message below and it will go directly to an administrator.",
    );
    inputRef.current?.focus();
  }, [sessionId]);

  const handleQuickAction = useCallback(
    (action: string) => {
      void sendMessage(action);
    },
    [sendMessage],
  );

  if (!open) {
    return (
      <button
        ref={triggerRef}
        type="button"
        className="support-widget-fab support-fab-polished"
        onClick={() => setOpen(true)}
        aria-label="Open support chat"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "#7c3aed",
          color: "white",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(124, 58, 237, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        <MessageCircle size={24} aria-hidden="true" />
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "-2px",
            right: "-2px",
            background: "#ef4444",
            borderRadius: "50%",
            width: "12px",
            height: "12px",
          }}
        />
      </button>
    );
  }

  return (
    <div
      ref={dialogRef}
      className="support-widget-pro"
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-dialog-title"
      onKeyDown={handleDialogKeyDown}
      style={{
        position: "fixed",
        bottom: "12px",
        right: "12px",
        width: "min(380px, calc(100vw - 24px))",
        maxHeight: "min(600px, calc(100dvh - 24px))",
        background: "#0A0A0B",
        borderRadius: "16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        zIndex: 9999,
        border: "1px solid #27272a",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "16px",
          background: "#18181b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #27272a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={18} color="#7c3aed" aria-hidden="true" />
          <div>
            <strong
              id="support-dialog-title"
              style={{ color: "#fafafa", fontSize: "14px" }}
            >
              Admin support
            </strong>
            <div style={{ fontSize: "11px", color: "#34d399" }}>
              ● Connected to the admin inbox
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close support chat"
          onClick={closeDialog}
          style={{
            background: "none",
            border: "none",
            color: "#a1a1aa",
            cursor: "pointer",
          }}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div
        aria-live="polite"
        aria-relevant="additions text"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          maxHeight: "400px",
        }}
      >
        <button
          type="button"
          className="admin-handoff-button"
          onClick={() => void requestHuman()}
          disabled={Boolean(sessionId)}
        >
          <UserRoundCheck size={16} aria-hidden="true" />{" "}
          {sessionId ? "Admin chat active" : "Messages go to an admin"}
        </button>
        {handoffMessage ? (
          <div className="admin-handoff-note" role="status">
            {handoffMessage}
          </div>
        ) : null}
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "#71717a",
              fontSize: "13px",
              padding: "20px",
            }}
          >
            <Sparkles
              size={32}
              style={{ margin: "0 auto 8px", display: "block" }}
              color="#7c3aed"
            />
            <strong
              style={{
                display: "block",
                color: "#fafafa",
                fontSize: "18px",
                marginBottom: "8px",
              }}
            >
              Message an administrator
            </strong>{" "}
            Ask about an order, selling, delivery, payments, deposits, or buyer
            protection. You can continue here when an admin replies.
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                padding: "10px 14px",
                borderRadius: "12px",
                fontSize: "13px",
                lineHeight: "1.5",
                background:
                  msg.role === "user"
                    ? "#7c3aed"
                    : msg.role === "admin"
                      ? "#0f766e"
                      : "#27272a",
                color: "#fafafa",
              }}
            >
              {msg.body}
            </div>
            {msg.quickActions && msg.quickActions.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "4px",
                  maxWidth: "85%",
                }}
              >
                {msg.quickActions.map((action) => (
                  <button
                    type="button"
                    key={action}
                    onClick={() => handleQuickAction(action)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "8px",
                      border: "1px solid #3f3f46",
                      background: "#18181b",
                      color: "#a1a1aa",
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {typing && (
          <div
            role="status"
            aria-label="Sending message"
            style={{ display: "flex", gap: "4px", padding: "8px" }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#71717a",
                  animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage(input);
        }}
        style={{
          padding: "12px",
          background: "#18181b",
          borderTop: "1px solid #27272a",
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          alignItems: "center",
        }}
      >
        {!user && !sessionId ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              width: "100%",
            }}
          >
            <label className="sr-only" htmlFor="support-guest-name">
              Your name
            </label>
            <input
              id="support-guest-name"
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              placeholder="Your name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={120}
              style={{
                minWidth: 0,
                background: "#0A0A0B",
                border: "1px solid #3f3f46",
                borderRadius: "8px",
                padding: "8px 10px",
                color: "#fafafa",
                fontSize: "13px",
              }}
            />
            <label className="sr-only" htmlFor="support-guest-email">
              Your email
            </label>
            <input
              id="support-guest-email"
              type="email"
              value={guestEmail}
              onChange={(event) => setGuestEmail(event.target.value)}
              placeholder="Email address"
              autoComplete="email"
              required
              maxLength={254}
              style={{
                minWidth: 0,
                background: "#0A0A0B",
                border: "1px solid #3f3f46",
                borderRadius: "8px",
                padding: "8px 10px",
                color: "#fafafa",
                fontSize: "13px",
              }}
            />
          </div>
        ) : null}
        <ShieldCheck size={17} color="#34d399" aria-hidden="true" />
        <label className="sr-only" htmlFor="support-message">
          Message to Ysello support
        </label>
        <input
          ref={inputRef}
          id="support-message"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            debouncedTyping(true);
          }}
          placeholder="Write a message to an admin…"
          style={{
            flex: 1,
            background: "#0A0A0B",
            border: "1px solid #3f3f46",
            borderRadius: "8px",
            padding: "8px 12px",
            color: "#fafafa",
            fontSize: "13px",
            outline: "none",
          }}
        />
        <button
          type="submit"
          aria-label="Send support message"
          disabled={!input.trim()}
          style={{
            background: "#7c3aed",
            border: "none",
            color: "white",
            borderRadius: "8px",
            padding: "8px",
            cursor: "pointer",
          }}
        >
          <Send size={16} aria-hidden="true" />
        </button>
      </form>
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
