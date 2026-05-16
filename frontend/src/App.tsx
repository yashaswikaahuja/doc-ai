import { useState, useRef } from 'react'
import axios from 'axios'
import { Upload, FileText, User, MapPin, GraduationCap, Banknote, CreditCard, Loader2 } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080'
const API_KEY = import.meta.env.VITE_API_KEY || 'dev-key'

interface ExtractedDoc {
  name?: string
  dob?: string
  gender?: string
  id_number?: string
  address?: string
  father_name?: string
  expiry?: string
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div>
      <p className="field-label">{label}</p>
      <p className="field-value">{value}</p>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-blue-400">{icon}</span>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

export default function App() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<ExtractedDoc | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function onFile(f: File) {
    setFile(f)
    setResult(null)
    setError(null)
    if (f.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = e => setPreview(e.target?.result as string)
      reader.readAsDataURL(f)
    } else {
      setPreview(null)
    }
  }

  async function extract() {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await axios.post(`${API}/extract`, fd, {
        headers: { 'X-API-Key': API_KEY }
      })
      setResult(data)
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="text-blue-400" size={24} /> Document Extractor
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Upload an Aadhaar, PAN, Voter ID or any Indian document
        </p>
      </div>

      {/* Upload */}
      <div
        className="card mb-6 flex flex-col items-center justify-center gap-3 cursor-pointer border-dashed"
        style={{ borderStyle: 'dashed', minHeight: 160 }}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
      >
        {preview
          ? <img src={preview} className="max-h-40 rounded-lg object-contain" />
          : <Upload size={32} className="text-blue-400" />
        }
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {file ? file.name : 'Click or drag & drop — JPG, PNG, PDF'}
        </p>
        <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
      </div>

      <button className="btn-primary w-full mb-8 flex items-center justify-center gap-2"
        onClick={extract} disabled={!file || loading}>
        {loading ? <><Loader2 size={16} className="animate-spin" /> Extracting...</> : 'Extract Document'}
      </button>

      {error && (
        <div className="card mb-6 border-red-500/30 text-red-400 text-sm">{error}</div>
      )}

      {/* Result Cards */}
      {result && (
        <div className="grid gap-4">

          {/* Personal Info */}
          {(result.name || result.dob || result.gender || result.father_name) && (
            <Section icon={<User size={16} />} title="Personal Information">
              <Field label="Full Name" value={result.name} />
              <Field label="Date of Birth" value={result.dob} />
              <Field label="Gender" value={result.gender} />
              <Field label="Father's Name" value={result.father_name} />
            </Section>
          )}

          {/* ID Card */}
          {(result.id_number || result.expiry) && (
            <Section icon={<CreditCard size={16} />} title="Identity Card">
              <Field label="ID Number" value={result.id_number} />
              <Field label="Expiry" value={result.expiry} />
            </Section>
          )}

          {/* Address */}
          {result.address && (
            <Section icon={<MapPin size={16} />} title="Address">
              <div className="col-span-2">
                <p className="field-label">Address</p>
                <p className="field-value">{result.address}</p>
              </div>
            </Section>
          )}

          {/* Raw JSON toggle */}
          <details className="card">
            <summary className="text-xs cursor-pointer" style={{ color: 'var(--muted-foreground)' }}>
              Raw JSON
            </summary>
            <pre className="mt-3 text-xs overflow-auto" style={{ color: '#94a3b8' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}
