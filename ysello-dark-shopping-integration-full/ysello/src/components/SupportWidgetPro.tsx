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

const SUPPORT_VISITOR_KEY = "ysello-support-visitor";

function createVisitorId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const bytes = new Uint32Array(4);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(36)).join("-");
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function supportVisitorToken() {
  try {
    const existing = window.localStorage.getItem(SUPPORT_VISITOR_KEY);
    if (existing) return existing;
    const created = `${createVisitorId()}-${createVisitorId()}`;
    window.localStorage.setItem(SUPPORT_VISITOR_KEY, created);
    return created;
  } catch {
    return `${createVisitorId()}-${createVisitorId()}`;
  }
}

export function SupportWidgetPro() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [handoffMessage, setHandoffMessage] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [visitorToken] = useState(supportVisitorToken);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (!open || sessionId) return;
    const query = user
      ? ""
      : `?visitorToken=${encodeURIComponent(visitorToken)}`;
    void apiRequest<{
      sessions: Array<{ id: string; status: string; messages: Message[] }>;
    }>(`/api/nexus/support/sessions${query}`)
      .then((data) => {
        const latest = data.sessions[0];
        if (!latest) return;
        setSessionId(latest.id);
        setMessages(latest.messages);
      })
      .catch(() => undefined);
  }, [open, sessionId, user, visitorToken]);

  useEffect(() => {
    if (!open || !sessionId) return;
    const refresh = async () => {
      const query = user
        ? ""
        : `?visitorToken=${encodeURIComponent(visitorToken)}`;
      const data = await apiRequest<{
        sessions: Array<{
          id: string;
          messages: Array<{
            id: string;
            role: "user" | "assistant" | "admin";
            body: string;
          }>;
        }>;
      }>(`/api/nexus/support/sessions${query}`).catch(() => null);
      const session = data?.sessions.find((item) => item.id === sessionId);
      if (session)
        setMessages(
          session.messages.map((item) => ({
            id: item.id,
            role: item.role,
            body: item.body,
          })),
        );
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [open, sessionId, user, visitorToken]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        body: text,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setTyping(true);

      try {
        if (sessionId) {
          await apiRequest(`/api/nexus/support/${sessionId}/messages`, {
            method: "POST",
            body: {
              body: text,
              visitorToken: user ? undefined : visitorToken,
            },
          });
        } else {
          if (!user && (!guestName.trim() || !guestEmail.trim())) {
            throw new Error("Guest details are required");
          }
          const result = await apiRequest<{
            session: { id: string; messages: Message[] };
            message: string;
          }>("/api/nexus/support/start", {
            method: "POST",
            body: {
              message: text,
              visitorToken: user ? undefined : visitorToken,
              guestName: user ? undefined : guestName.trim(),
              guestEmail: user ? undefined : guestEmail.trim(),
              subject: "Marketplace support request",
            },
          });
          setSessionId(result.session.id);
          setMessages(result.session.messages);
        }
        setHandoffMessage("Sent to the admin inbox.");
      } catch {
        const errMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          body: "Your message could not reach the admin inbox. Please try once more.",
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setTyping(false);
      }
    },
    [guestEmail, guestName, sessionId, user, visitorToken],
  );

  const requestHuman = useCallback(async () => {
    try {
      const result = await apiRequest<{
        session: { id: string; messages: Message[] };
      }>("/api/nexus/support/start", {
        method: "POST",
        body: {
          sessionId: sessionId ?? undefined,
          visitorToken: user ? undefined : visitorToken,
          message: "I would like to chat with an administrator.",
          guestName: user ? undefined : guestName.trim() || "Guest visitor",
          guestEmail: user ? undefined : guestEmail.trim() || undefined,
          subject: "Administrator support request",
        },
      });
      setSessionId(result.session.id);
      setMessages(result.session.messages);
      setHandoffMessage(
        "An administrator has been notified. Replies will appear here.",
      );
    } catch {
      setHandoffMessage("Admin handoff could not start. Please try again.");
    }
  }, [guestEmail, guestName, sessionId, user, visitorToken]);

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
              Ysello admin support
            </strong>
            <div style={{ fontSize: "11px", color: "#34d399" }}>
              ● Secure admin conversation
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
          disabled={
            Boolean(sessionId) ||
            (!user && (!guestName.trim() || !guestEmail.trim()))
          }
        >
          <UserRoundCheck size={16} aria-hidden="true" />{" "}
          {sessionId ? "Admin chat active" : "Start admin chat"}
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
              How can we help?
            </strong>{" "}
            Send a message directly to the Ysello admin team. You can return
            here to see the reply.
          </div>
        )}
        {!user && !sessionId ? (
          <div className="support-guest-fields">
            <label>
              <span>Your name</span>
              <input
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                placeholder="Name"
                autoComplete="name"
              />
            </label>
            <label>
              <span>Email for replies</span>
              <input
                value={guestEmail}
                onChange={(event) => setGuestEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
              />
            </label>
          </div>
        ) : null}
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
            aria-label="Support is typing"
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
          gap: "8px",
          alignItems: "center",
        }}
      >
        <ShieldCheck size={17} color="#34d399" aria-hidden="true" />
        <label className="sr-only" htmlFor="support-message">
          Message to Ysello support
        </label>
        <input
          ref={inputRef}
          id="support-message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Write a message to admin…"
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
          disabled={
            !input.trim() ||
            (!user && !sessionId && (!guestName.trim() || !guestEmail.trim()))
          }
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
