import React, { useState, useRef, ChangeEvent, FormEvent } from "react"
import {
  IconCamera,
  IconCheck,
  IconTrash,
  IconX,
  IconUser,
  IconSchool,
  IconAlertTriangle,
  IconShieldCheck,
  IconSparkles,
} from "@tabler/icons-react"
import { lookupStudentVerification, StudentVerification } from "../data/student-verification"

export interface AccountSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser: {
    id: number | string
    name: string
    email: string
    role: string
    avatar: string
    batch?: string
    section?: string
    studentId?: string
    cgpa?: string | number
    credits?: string | number
    isVerified?: boolean
    bio?: string
  }
  onSaveProfile: (updatedData: {
    name: string
    avatar: string
    role: string
    batch: string
    section: string
    studentId: string
    cgpa?: number | string
    credits?: number | string
    isVerified?: boolean
    bio: string
  }) => Promise<void> | void
  onDeleteAccount: () => Promise<void> | void
  colorScheme?: string
}

export function AccountSettingsModal({
  isOpen,
  onClose,
  currentUser,
  onSaveProfile,
  onDeleteAccount,
  colorScheme = "dark",
}: AccountSettingsModalProps) {
  const isDark = colorScheme === "dark"
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state initialized from currentUser
  const [name, setName] = useState(currentUser.name || "")
  const [avatar, setAvatar] = useState(currentUser.avatar || "")
  const [role, setRole] = useState(currentUser.role || "Team Leader")
  const [batch, setBatch] = useState(currentUser.batch || "63rd Batch")
  const [section, setSection] = useState(currentUser.section || "Section C")
  const [studentId, setStudentId] = useState(currentUser.studentId || "0272320005101220")
  const [bio, setBio] = useState(currentUser.bio || "")

  // Student verification state
  const [verifiedRecord, setVerifiedRecord] = useState<StudentVerification | null>(() => {
    if (currentUser.studentId) {
      return lookupStudentVerification(currentUser.studentId) || null
    }
    return lookupStudentVerification("0272320005101220") || null
  })
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  // Account deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (!isOpen) return null

  // Handle Photo Upload
  const handlePhotoSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, WebP)")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      if (result) {
        setAvatar(result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setAvatar("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Handle Student Verification
  const handleVerifyStudentId = () => {
    setIsVerifying(true)
    setVerificationFeedback(null)
    setTimeout(() => {
      const match = lookupStudentVerification(studentId)
      if (match) {
        setVerifiedRecord(match)
        setVerificationFeedback(`Verified! Record matched for ${match.studentName}.`)
      } else {
        setVerifiedRecord(null)
        setVerificationFeedback("No matching record found in the 63rd Batch verification database.")
      }
      setIsVerifying(false)
    }, 400)
  }

  // Apply matched student name
  const handleApplyVerifiedName = () => {
    if (verifiedRecord) {
      setName(verifiedRecord.studentName)
    }
  }

  // Handle Form Submit
  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSaving(true)
    try {
      await onSaveProfile({
        name: name.trim(),
        avatar,
        role: role.trim() || "Researcher",
        batch: batch.trim(),
        section: section.trim(),
        studentId: studentId.trim(),
        cgpa: verifiedRecord?.cgpa || currentUser.cgpa,
        credits: verifiedRecord?.totalCreditsEarned || currentUser.credits,
        isVerified: !!verifiedRecord,
        bio: bio.trim(),
      })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  // Handle Final Delete
  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      await onDeleteAccount()
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }

  // Initials for avatar fallback
  const initials = (name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const quickRoles = [
    "Team Leader",
    "Senior Researcher",
    "AI Security Researcher",
    "Frontend Engineer",
    "Data Analyst",
    "General Member",
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-md"
      style={{ backgroundColor: isDark ? "rgba(4, 10, 7, 0.85)" : "rgba(15, 23, 42, 0.55)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !showDeleteConfirm) onClose()
      }}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl border shadow-2xl transition-all"
        style={{
          backgroundColor: isDark ? "#111f18" : "#ffffff",
          borderColor: isDark ? "#1c3327" : "#e2e8f0",
          color: isDark ? "#f0fdf4" : "#0f172a",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-6 py-4.5"
          style={{ borderColor: isDark ? "#1c3327" : "#f1f5f9" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="grid size-10 place-items-center rounded-2xl"
              style={{
                backgroundColor: isDark ? "#16291e" : "#ecfdf5",
                color: isDark ? "#34d399" : "#059669",
              }}
            >
              <IconUser className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Account & Profile Settings</h2>
              <p
                className="text-xs font-medium"
                style={{ color: isDark ? "#86efac" : "#64748b" }}
              >
                Manage personal info, photo, academic credentials & account
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-xl transition hover:opacity-80"
            style={{
              backgroundColor: isDark ? "#16291e" : "#f1f5f9",
              color: isDark ? "#94a3b8" : "#64748b",
            }}
            title="Close"
          >
            <IconX className="size-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <form id="account-settings-form" onSubmit={handleFormSubmit} className="space-y-6">
            
            {/* Section 1: Profile Photo */}
            <div
              className="rounded-2xl border p-4.5"
              style={{
                backgroundColor: isDark ? "#0d1812" : "#f8fafc",
                borderColor: isDark ? "#1c3327" : "#e2e8f0",
              }}
            >
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
                style={{ color: isDark ? "#34d399" : "#059669" }}
              >
                <IconCamera className="size-3.5" />
                Profile Photo (Avatar)
              </h3>
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="relative group shrink-0">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={name}
                      className="size-20 rounded-full object-cover ring-2 ring-emerald-500/50 shadow-md"
                    />
                  ) : (
                    <div
                      className="size-20 rounded-full grid place-items-center font-bold text-xl text-white shadow-md ring-2 ring-emerald-500/50"
                      style={{ backgroundColor: isDark ? "#059669" : "#4f46e5" }}
                    >
                      {initials}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 grid place-items-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition backdrop-blur-xs cursor-pointer"
                    title="Change Photo"
                  >
                    <IconCamera className="size-6" />
                  </button>
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer"
                      style={{
                        backgroundColor: isDark ? "#16291e" : "#ffffff",
                        borderColor: isDark ? "#1c3327" : "#cbd5e1",
                        borderWidth: 1,
                        color: isDark ? "#f0fdf4" : "#1e293b",
                      }}
                    >
                      <IconCamera className="size-3.5 text-emerald-500" />
                      Upload New Photo
                    </button>
                    {avatar && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition hover:bg-rose-500/10 cursor-pointer text-rose-500"
                        style={{
                          borderColor: isDark ? "rgba(244, 63, 94, 0.2)" : "#fecdd3",
                          borderWidth: 1,
                        }}
                      >
                        <IconTrash className="size-3.5" />
                        Remove Photo
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Recommended: Square image (JPG, PNG, WebP). Max 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Personal Details */}
            <div
              className="rounded-2xl border p-4.5 space-y-4"
              style={{
                backgroundColor: isDark ? "#0d1812" : "#f8fafc",
                borderColor: isDark ? "#1c3327" : "#e2e8f0",
              }}
            >
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                style={{ color: isDark ? "#34d399" : "#059669" }}
              >
                <IconUser className="size-3.5" />
                Personal Information
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: isDark ? "#a7f3d0" : "#334155" }}>
                    Full Name <span className="text-emerald-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Md Sabbir Ahmed"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none transition"
                    style={{
                      backgroundColor: isDark ? "#0b1410" : "#ffffff",
                      borderColor: isDark ? "#1c3327" : "#cbd5e1",
                      borderWidth: 1,
                      color: isDark ? "#f0fdf4" : "#0f172a",
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: isDark ? "#a7f3d0" : "#334155" }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={currentUser.email || "ss@gmail.com"}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm font-medium opacity-70 cursor-not-allowed outline-none"
                    style={{
                      backgroundColor: isDark ? "#0b1410" : "#f1f5f9",
                      borderColor: isDark ? "#1c3327" : "#cbd5e1",
                      borderWidth: 1,
                      color: isDark ? "#94a3b8" : "#64748b",
                    }}
                  />
                </div>
              </div>

              {/* Research Role */}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: isDark ? "#a7f3d0" : "#334155" }}>
                  Research Role / Designation
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Team Leader, Senior Researcher"
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none transition"
                  style={{
                    backgroundColor: isDark ? "#0b1410" : "#ffffff",
                    borderColor: isDark ? "#1c3327" : "#cbd5e1",
                    borderWidth: 1,
                    color: isDark ? "#f0fdf4" : "#0f172a",
                  }}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {quickRoles.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                        role === r
                          ? "bg-emerald-600 text-white"
                          : isDark
                          ? "bg-[#16291e] text-[#86efac] hover:bg-[#1d3527]"
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 3: Academic Profile & Student ID Verification */}
            <div
              className="rounded-2xl border p-4.5 space-y-4"
              style={{
                backgroundColor: isDark ? "#0d1812" : "#f8fafc",
                borderColor: isDark ? "#1c3327" : "#e2e8f0",
              }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                  style={{ color: isDark ? "#34d399" : "#059669" }}
                >
                  <IconSchool className="size-3.5" />
                  Academic Profile & Verification
                </h3>
                {verifiedRecord && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                    <IconShieldCheck className="size-3.5 text-emerald-400" />
                    Verified Student
                  </span>
                )}
              </div>

              {/* Student ID Lookup */}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: isDark ? "#a7f3d0" : "#334155" }}>
                  Student ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. 0272320005101220 or 1220"
                    className="min-w-0 flex-1 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none transition"
                    style={{
                      backgroundColor: isDark ? "#0b1410" : "#ffffff",
                      borderColor: isDark ? "#1c3327" : "#cbd5e1",
                      borderWidth: 1,
                      color: isDark ? "#f0fdf4" : "#0f172a",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyStudentId}
                    disabled={!studentId.trim() || isVerifying}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition disabled:opacity-50 cursor-pointer text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm"
                  >
                    {isVerifying ? (
                      "Checking..."
                    ) : (
                      <>
                        <IconSparkles className="size-3.5" />
                        Verify ID
                      </>
                    )}
                  </button>
                </div>
                {verificationFeedback && (
                  <p
                    className="mt-1.5 text-xs font-medium"
                    style={{ color: verifiedRecord ? "#34d399" : "#fbbf24" }}
                  >
                    {verificationFeedback}
                  </p>
                )}
              </div>

              {/* Verified Record Details Card */}
              {verifiedRecord && (
                <div
                  className="rounded-xl border p-3.5 text-xs"
                  style={{
                    backgroundColor: isDark ? "#08130e" : "#ecfdf5",
                    borderColor: isDark ? "#1c4d33" : "#a7f3d0",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-emerald-400">Database Record</span>
                    <button
                      type="button"
                      onClick={handleApplyVerifiedName}
                      className="text-[11px] font-semibold underline text-emerald-300 hover:text-emerald-200 cursor-pointer"
                    >
                      Use name: "{verifiedRecord.studentName}"
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
                    <div className="rounded-lg p-2 bg-black/20">
                      <span className="block text-[10px] text-slate-400">CGPA</span>
                      <strong className="text-sm font-bold text-emerald-300">
                        {verifiedRecord.cgpa.toFixed(2)}
                      </strong>
                    </div>
                    <div className="rounded-lg p-2 bg-black/20">
                      <span className="block text-[10px] text-slate-400">Earned Credits</span>
                      <strong className="text-sm font-bold text-emerald-300">
                        {verifiedRecord.totalCreditsEarned}
                      </strong>
                    </div>
                    <div className="rounded-lg p-2 bg-black/20">
                      <span className="block text-[10px] text-slate-400">Attempted</span>
                      <strong className="text-sm font-bold text-slate-300">
                        {verifiedRecord.totalCreditsAttempted}
                      </strong>
                    </div>
                    <div className="rounded-lg p-2 bg-black/20">
                      <span className="block text-[10px] text-slate-400">Status</span>
                      <strong className="text-sm font-bold text-emerald-400">
                        {verifiedRecord.status}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Batch & Section */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: isDark ? "#a7f3d0" : "#334155" }}>
                    Batch
                  </label>
                  <input
                    type="text"
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    placeholder="e.g. 63rd Batch"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none transition"
                    style={{
                      backgroundColor: isDark ? "#0b1410" : "#ffffff",
                      borderColor: isDark ? "#1c3327" : "#cbd5e1",
                      borderWidth: 1,
                      color: isDark ? "#f0fdf4" : "#0f172a",
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: isDark ? "#a7f3d0" : "#334155" }}>
                    Section
                  </label>
                  <input
                    type="text"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="e.g. Section C"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none transition"
                    style={{
                      backgroundColor: isDark ? "#0b1410" : "#ffffff",
                      borderColor: isDark ? "#1c3327" : "#cbd5e1",
                      borderWidth: 1,
                      color: isDark ? "#f0fdf4" : "#0f172a",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Bio / Research Summary */}
            <div
              className="rounded-2xl border p-4.5 space-y-3"
              style={{
                backgroundColor: isDark ? "#0d1812" : "#f8fafc",
                borderColor: isDark ? "#1c3327" : "#e2e8f0",
              }}
            >
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                style={{ color: isDark ? "#34d399" : "#059669" }}
              >
                <IconSparkles className="size-3.5" />
                Bio / Research Focus
              </h3>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Briefly state your current research interests, thesis goals, or technical specializations..."
                className="w-full rounded-xl p-3 text-sm outline-none transition resize-none"
                style={{
                  backgroundColor: isDark ? "#0b1410" : "#ffffff",
                  borderColor: isDark ? "#1c3327" : "#cbd5e1",
                  borderWidth: 1,
                  color: isDark ? "#f0fdf4" : "#0f172a",
                }}
              />
            </div>

            {/* Section 5: Danger Zone (Account Deletion) */}
            <div
              className="rounded-2xl border p-4.5 space-y-3 transition"
              style={{
                backgroundColor: isDark ? "rgba(239, 68, 68, 0.04)" : "#fff1f2",
                borderColor: isDark ? "rgba(239, 68, 68, 0.25)" : "#fecdd3",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-2">
                    <IconAlertTriangle className="size-4" />
                    Danger Zone · Delete Account
                  </h3>
                  <p className="mt-1 text-xs text-rose-400/90 max-w-md">
                    Permanently delete your profile and remove your membership from this research unit. This cannot be undone.
                  </p>
                </div>
                {!showDeleteConfirm && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500 hover:text-white transition cursor-pointer"
                  >
                    Delete Account
                  </button>
                )}
              </div>

              {/* Confirmation Prompt */}
              {showDeleteConfirm && (
                <div
                  className="mt-3 rounded-xl border border-rose-500/40 p-3.5 space-y-3"
                  style={{ backgroundColor: isDark ? "#180d0f" : "#ffe4e6" }}
                >
                  <p className="text-xs font-semibold text-rose-300">
                    Are you sure? Type <strong className="font-mono text-rose-400 font-bold">DELETE</strong> below to confirm permanent deletion:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="w-full rounded-xl px-3.5 py-2 text-xs font-mono outline-none border border-rose-500/40"
                    style={{
                      backgroundColor: isDark ? "#0b0607" : "#ffffff",
                      color: isDark ? "#fca5a5" : "#be123c",
                    }}
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteConfirm(false)
                        setDeleteConfirmationText("")
                      }}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={deleteConfirmationText !== "DELETE" || isDeleting}
                      onClick={handleConfirmDelete}
                      className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-40 transition cursor-pointer shadow-sm"
                    >
                      {isDeleting ? "Deleting..." : "Permanently Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </form>
        </div>

        {/* Modal Footer */}
        <div
          className="flex items-center justify-end gap-3 border-t px-6 py-4"
          style={{ borderColor: isDark ? "#1c3327" : "#f1f5f9" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-xs font-bold transition hover:opacity-80 cursor-pointer"
            style={{
              backgroundColor: isDark ? "#16291e" : "#f1f5f9",
              color: isDark ? "#86efac" : "#64748b",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="account-settings-form"
            disabled={isSaving || !name.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white transition shadow-lg shadow-emerald-950/40 disabled:opacity-50 cursor-pointer"
          >
            <IconCheck className="size-4" />
            {isSaving ? "Saving Changes..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  )
}
