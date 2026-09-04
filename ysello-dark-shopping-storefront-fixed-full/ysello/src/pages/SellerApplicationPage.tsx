import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, FileCheck2, Send, Store } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiRequest, type SellerApplication } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Alert } from "../components/Alert";
import { Seo } from "../components/Seo";

type SellerForm = {
  userName: string;
  fullLegalName: string;
  email: string;
  country: string;
  stateProvince: string;
  city: string;
  storeName: string;
  documentName: string;
  documentType: "ID_CARD" | "PASSPORT";
  storeDescription: string;
  productCategories: string;
  termsAccepted: boolean;
};

function initialForm(user: ReturnType<typeof useAuth>["user"]): SellerForm {
  const legalName = user ? `${user.firstName} ${user.lastName}` : "";

  return {
    userName: user?.username ?? "",
    fullLegalName: legalName,
    email: user?.email ?? "",
    country: user?.country ?? "",
    stateProvince: "",
    city: user?.city ?? "",
    storeName: "",
    documentName: legalName,
    documentType: "ID_CARD",
    storeDescription: "",
    productCategories: "",
    termsAccepted: false,
  };
}

function applicationMessage(application: SellerApplication) {
  if (application.status === "PENDING") {
    return "Your seller application is pending approval / in moderation. You can upload products after admin approval.";
  }
  if (application.status === "APPROVED") {
    return "Your seller application is approved. Seller product upload access is active.";
  }
  return `Your seller application was rejected${application.adminNotes ? `: ${application.adminNotes}` : "."}`;
}

export function SellerApplicationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<SellerForm>(() => initialForm(user));
  const [documentFront, setDocumentFront] = useState<File | null>(null);
  const [documentBack, setDocumentBack] = useState<File | null>(null);
  const [application, setApplication] = useState<SellerApplication | null>(
    null,
  );
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role === "SELLER") {
      navigate("/seller", { replace: true });
      return;
    }

    setForm(initialForm(user));
    void apiRequest<{ application: SellerApplication | null }>(
      "/api/seller/application",
    )
      .then((data) => setApplication(data.application))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [navigate, user]);

  function updateField<K extends keyof SellerForm>(
    key: K,
    value: SellerForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!documentFront || !documentBack) {
      setStatus({
        type: "error",
        message: "Upload both front and back side of the seller document.",
      });
      return;
    }

    if (!form.termsAccepted) {
      setStatus({
        type: "error",
        message: "Accept the seller terms to continue.",
      });
      return;
    }

    const data = new FormData();
    data.append("userName", form.userName);
    data.append("fullLegalName", form.fullLegalName);
    data.append("email", form.email);
    data.append("country", form.country);
    data.append("stateProvince", form.stateProvince);
    data.append("city", form.city);
    data.append("storeName", form.storeName);
    data.append("documentName", form.documentName);
    data.append("documentType", form.documentType);
    data.append("storeDescription", form.storeDescription);
    data.append("productCategories", form.productCategories);
    data.append("termsAccepted", String(form.termsAccepted));
    data.append("documentFront", documentFront);
    data.append("documentBack", documentBack);

    setSubmitting(true);
    try {
      const response = await apiRequest<{
        application: SellerApplication;
        message: string;
      }>("/api/seller/application", { method: "POST", body: data });
      setApplication(response.application);
      setStatus({ type: "success", message: response.message });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof ApiError
            ? error.message
            : "Could not submit seller application.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="center-page">
      <Seo
        title="Seller application"
        description="Apply for reviewed Ysello seller access."
        noIndex
      />
      <form className="auth-form wide" onSubmit={submit}>
        <Link className="secondary-button" to="/dashboard">
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <div className="form-heading">
          <Store size={22} aria-hidden="true" />
          <h2>Seller application</h2>
          <p>
            Seller stores are reviewed by admin before product uploads are
            allowed.
          </p>
        </div>

        {loading ? (
          <Alert type="success" message="Checking your seller status..." />
        ) : null}
        {status ? <Alert type={status.type} message={status.message} /> : null}
        {application ? (
          <Alert
            type={application.status === "REJECTED" ? "error" : "success"}
            message={applicationMessage(application)}
          />
        ) : null}

        {application ? (
          <div className="seller-application-summary">
            <strong>{application.storeName}</strong>
            <span className={`status-pill ${application.status.toLowerCase()}`}>
              {application.status.replaceAll("_", " ")}
            </span>
            <small>
              Submitted {new Date(application.createdAt).toLocaleString()}
            </small>
          </div>
        ) : null}

        {!application ? (
          <>
            <div className="form-grid two">
              <label className="field" htmlFor="sellerUserName">
                <span>Username</span>
                <input
                  id="sellerUserName"
                  value={form.userName}
                  onChange={(event) =>
                    updateField("userName", event.target.value)
                  }
                  required
                />
              </label>
              <label className="field" htmlFor="sellerLegalName">
                <span>Legal name</span>
                <input
                  id="sellerLegalName"
                  value={form.fullLegalName}
                  onChange={(event) =>
                    updateField("fullLegalName", event.target.value)
                  }
                  required
                />
              </label>
              <label className="field" htmlFor="sellerEmail">
                <span>Email</span>
                <input
                  id="sellerEmail"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  required
                />
              </label>
              <label className="field" htmlFor="sellerCountry">
                <span>Country</span>
                <input
                  id="sellerCountry"
                  value={form.country}
                  onChange={(event) =>
                    updateField("country", event.target.value)
                  }
                  required
                />
              </label>
              <label className="field" htmlFor="sellerState">
                <span>State / province</span>
                <input
                  id="sellerState"
                  value={form.stateProvince}
                  onChange={(event) =>
                    updateField("stateProvince", event.target.value)
                  }
                  required
                />
              </label>
              <label className="field" htmlFor="sellerCity">
                <span>City</span>
                <input
                  id="sellerCity"
                  value={form.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  required
                />
              </label>
            </div>

            <label className="field" htmlFor="storeName">
              <span>Store name</span>
              <input
                id="storeName"
                value={form.storeName}
                onChange={(event) =>
                  updateField("storeName", event.target.value)
                }
                required
              />
            </label>

            <div className="seller-document-box">
              <div>
                <FileCheck2 size={20} aria-hidden="true" />
                <span>
                  <strong>Identity document</strong>
                  <small>
                    Required for seller moderation. Upload the front and back
                    side.
                  </small>
                </span>
              </div>
              <div className="form-grid two">
                <label className="field" htmlFor="documentName">
                  <span>Name on document</span>
                  <input
                    id="documentName"
                    value={form.documentName}
                    onChange={(event) =>
                      updateField("documentName", event.target.value)
                    }
                    required
                  />
                </label>
                <label className="field" htmlFor="documentType">
                  <span>Document type</span>
                  <select
                    id="documentType"
                    value={form.documentType}
                    onChange={(event) =>
                      updateField(
                        "documentType",
                        event.target.value as SellerForm["documentType"],
                      )
                    }
                    required
                  >
                    <option value="ID_CARD">ID card / CNIC</option>
                    <option value="PASSPORT">Passport</option>
                  </select>
                </label>
                <label className="field" htmlFor="documentFront">
                  <span>Front side</span>
                  <input
                    id="documentFront"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(event) =>
                      setDocumentFront(event.target.files?.[0] ?? null)
                    }
                    required
                  />
                  <small>
                    {documentFront
                      ? documentFront.name
                      : "JPEG, PNG, WebP, or PDF"}
                  </small>
                </label>
                <label className="field" htmlFor="documentBack">
                  <span>Back side</span>
                  <input
                    id="documentBack"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(event) =>
                      setDocumentBack(event.target.files?.[0] ?? null)
                    }
                    required
                  />
                  <small>
                    {documentBack
                      ? documentBack.name
                      : "JPEG, PNG, WebP, or PDF"}
                  </small>
                </label>
              </div>
            </div>

            <label className="field" htmlFor="storeCategories">
              <span>Product categories</span>
              <input
                id="storeCategories"
                value={form.productCategories}
                onChange={(event) =>
                  updateField("productCategories", event.target.value)
                }
                placeholder="Templates, design assets, services"
                required
              />
            </label>
            <label className="field" htmlFor="storeDescription">
              <span>Store description</span>
              <textarea
                id="storeDescription"
                rows={5}
                value={form.storeDescription}
                onChange={(event) =>
                  updateField("storeDescription", event.target.value)
                }
                required
              />
            </label>

            <label className="check-row">
              <input
                type="checkbox"
                checked={form.termsAccepted}
                onChange={(event) =>
                  updateField("termsAccepted", event.target.checked)
                }
              />
              <span>I accept the seller terms and product review rules.</span>
            </label>

            <button
              className="primary-button"
              type="submit"
              disabled={submitting}
            >
              <Send size={18} aria-hidden="true" />
              {submitting ? "Submitting..." : "Submit for admin review"}
            </button>
          </>
        ) : null}
      </form>
    </main>
  );
}
