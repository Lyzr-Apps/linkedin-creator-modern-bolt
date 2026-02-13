'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { FiEdit2, FiRefreshCw, FiSend, FiImage, FiCopy, FiCheck, FiUser, FiClock, FiZap, FiGlobe, FiMoreHorizontal, FiThumbsUp, FiMessageCircle, FiRepeat } from 'react-icons/fi'

// ── Constants ──────────────────────────────────────────────────────────────

const AGENT_ID = '698efa107729fa642c1b3cf8'

const LI = {
  blue: '#0a66c2',
  blueHover: '#004182',
  blueLighter: '#e8f3ff',
  bg: '#f4f2ee',
  cardBg: '#ffffff',
  textPrimary: 'rgba(0,0,0,0.9)',
  textSecondary: 'rgba(0,0,0,0.6)',
  textTertiary: 'rgba(0,0,0,0.4)',
  green: '#057642',
  border: 'rgba(0,0,0,0.08)',
  shadow: '0 0 0 1px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.08)',
  shadowHover: '0 0 0 1px rgba(0,0,0,.08), 0 4px 8px rgba(0,0,0,.12)',
}

const THEME_VARS: React.CSSProperties = {
  '--background': '40 23% 95%',
  '--foreground': '0 0% 6%',
  '--card': '0 0% 100%',
  '--card-foreground': '0 0% 6%',
  '--primary': '209 92% 40%',
  '--primary-foreground': '0 0% 100%',
  '--secondary': '40 15% 92%',
  '--secondary-foreground': '0 0% 12%',
  '--accent': '209 92% 40%',
  '--accent-foreground': '0 0% 100%',
  '--muted': '40 10% 90%',
  '--muted-foreground': '0 0% 40%',
  '--border': '0 0% 90%',
  '--input': '0 0% 85%',
  '--ring': '209 92% 40%',
  '--radius': '0.5rem',
} as React.CSSProperties

const STYLE_OPTIONS = [
  { value: 'thought-leadership', label: 'Thought Leadership' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'tips-tricks', label: 'Tips & Tricks' },
  { value: 'personal-story', label: 'Personal Story' },
  { value: 'industry-news', label: 'Industry News' },
]

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'inspirational', label: 'Inspirational' },
  { value: 'educational', label: 'Educational' },
]

const SAMPLE_POSTS: HistoryItem[] = [
  {
    id: 'sample-1',
    topic: 'The future of remote work',
    postText: 'Remote work is not just a trend -- it is the future of how we collaborate. After two years of distributed teams, here are 5 lessons I have learned about building culture across time zones...',
    hashtags: '#RemoteWork #FutureOfWork #Leadership',
    hookLine: 'The office is dead. Long live the office.',
    callToAction: 'What remote work lesson has shaped your team the most? Share below.',
    postStyle: 'Thought Leadership',
    characterCount: 342,
    imageUrl: '',
    timestamp: 'Today, 9:30 AM',
  },
  {
    id: 'sample-2',
    topic: 'AI in hiring',
    postText: 'We just integrated AI screening into our hiring pipeline. The results? 40% faster time-to-hire and candidates report a better experience. Here is what we did differently...',
    hashtags: '#AI #Hiring #HRTech #Recruitment',
    hookLine: 'We let AI screen 500 resumes. Here is what happened next.',
    callToAction: 'Curious about AI in hiring? Drop a comment and I will share our playbook.',
    postStyle: 'Announcement',
    characterCount: 289,
    imageUrl: '',
    timestamp: 'Yesterday, 2:15 PM',
  },
  {
    id: 'sample-3',
    topic: 'Networking tips for introverts',
    postText: 'As an introvert, networking events used to terrify me. Then I discovered 3 simple strategies that changed everything. Tip 1: Arrive early when the room is still quiet...',
    hashtags: '#Networking #CareerGrowth #Introverts',
    hookLine: 'I used to hide in the bathroom at networking events.',
    callToAction: 'Fellow introverts -- what is your go-to networking strategy?',
    postStyle: 'Personal Story',
    characterCount: 278,
    imageUrl: '',
    timestamp: '2 days ago',
  },
]

// ── Types ──────────────────────────────────────────────────────────────────

interface PostData {
  post_text: string
  hashtags: string
  hook_line: string
  call_to_action: string
  post_style: string
  character_count: number
}

interface HistoryItem {
  id: string
  topic: string
  postText: string
  hashtags: string
  hookLine: string
  callToAction: string
  postStyle: string
  characterCount: number
  imageUrl: string
  timestamp: string
}

interface FormState {
  topic: string
  style: string
  tone: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">{part}</strong>
    ) : (
      part
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## '))
          return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm leading-relaxed">{formatInline(line)}</p>
      })}
    </div>
  )
}

function parseAgentResponse(result: Record<string, any> | null | undefined): PostData | null {
  if (!result) return null
  const rawResult = result?.response?.result
  let parsed: Record<string, any> | null = null
  if (typeof rawResult === 'string') {
    try { parsed = JSON.parse(rawResult) } catch { parsed = null }
  } else if (rawResult && typeof rawResult === 'object') {
    parsed = rawResult
  }
  if (!parsed) return null
  return {
    post_text: parsed?.post_text ?? '',
    hashtags: parsed?.hashtags ?? '',
    hook_line: parsed?.hook_line ?? '',
    call_to_action: parsed?.call_to_action ?? '',
    post_style: parsed?.post_style ?? '',
    character_count: parsed?.character_count ?? 0,
  }
}

function extractImageUrl(result: Record<string, any> | null | undefined): string {
  const files = result?.module_outputs?.artifact_files
  if (Array.isArray(files) && files.length > 0) {
    return files[0]?.file_url ?? ''
  }
  return ''
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36)
}

// ── Sub-components ─────────────────────────────────────────────────────────

function LoadingSpinner({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <FiRefreshCw className="w-4 h-4 animate-spin" style={{ color: LI.textSecondary }} />
      <span className="text-sm" style={{ color: LI.textSecondary }}>{text}</span>
    </div>
  )
}

function StatusMessage({ type, message }: { type: 'success' | 'error' | 'info'; message: string }) {
  const styles: Record<string, React.CSSProperties> = {
    success: { color: LI.green, backgroundColor: '#f0faf4', borderColor: '#c6e9d4' },
    error: { color: '#cc1016', backgroundColor: '#fef2f2', borderColor: '#fecaca' },
    info: { color: LI.blue, backgroundColor: LI.blueLighter, borderColor: '#bfdbfe' },
  }
  return (
    <div className="px-3 py-2 text-xs border mt-2" style={{ ...styles[type], borderRadius: '8px' }}>
      {message}
    </div>
  )
}

function PostPreviewSkeleton() {
  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-11/12" />
      <Skeleton className="h-3 w-10/12" />
      <Skeleton className="h-3 w-9/12" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-7/12" />
      <Skeleton className="h-48 w-full mt-4" />
    </div>
  )
}

function LinkedInMockProfile() {
  return (
    <div className="flex items-start gap-3 mb-3">
      <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: LI.blue }}>
        <FiUser className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm" style={{ color: LI.textPrimary }}>Your Name</p>
        <p className="text-xs" style={{ color: LI.textSecondary }}>Your Headline | Your Company</p>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-xs" style={{ color: LI.textTertiary }}>Just now</span>
          <span className="text-xs" style={{ color: LI.textTertiary }}>&#183;</span>
          <FiGlobe className="w-3 h-3" style={{ color: LI.textTertiary }} />
        </div>
      </div>
      <button className="p-1.5 rounded-full hover:bg-black/5 transition-colors" style={{ color: LI.textSecondary }}>
        <FiMoreHorizontal className="w-5 h-5" />
      </button>
    </div>
  )
}

function LinkedInReactionBar() {
  const actions = [
    { icon: FiThumbsUp, label: 'Like' },
    { icon: FiMessageCircle, label: 'Comment' },
    { icon: FiRepeat, label: 'Repost' },
    { icon: FiSend, label: 'Send' },
  ]
  return (
    <div>
      <div className="flex items-center gap-4 px-3 py-1.5">
        <span className="text-xs" style={{ color: LI.textSecondary }}>Be the first to react</span>
      </div>
      <div className="border-t" style={{ borderColor: LI.border }}>
        <div className="flex items-center justify-around py-1">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.label}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-md hover:bg-black/5 transition-colors flex-1 justify-center"
              >
                <Icon className="w-5 h-5" style={{ color: LI.textSecondary }} />
                <span className="text-xs font-semibold hidden sm:inline" style={{ color: LI.textSecondary }}>{action.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function HashtagDisplay({ hashtags }: { hashtags: string }) {
  if (!hashtags) return null
  const tags = hashtags.split(/[\s,]+/).filter((t) => t.startsWith('#') || t.length > 0)
  return (
    <p className="mt-3 text-sm leading-relaxed">
      {tags.map((tag, i) => {
        const cleanTag = tag.startsWith('#') ? tag : `#${tag}`
        return (
          <span key={i}>
            <span className="font-semibold cursor-pointer hover:underline" style={{ color: LI.blue }}>{cleanTag}</span>
            {i < tags.length - 1 ? ' ' : ''}
          </span>
        )
      })}
    </p>
  )
}

function HistoryCard({ item, onSelect }: { item: HistoryItem; onSelect: (item: HistoryItem) => void }) {
  return (
    <button
      onClick={() => onSelect(item)}
      className="w-full text-left p-3 hover:bg-black/[0.03] transition-colors"
    >
      <p className="text-sm font-semibold truncate" style={{ color: LI.textPrimary }}>{item.topic}</p>
      <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: LI.textSecondary }}>{item.postText?.slice(0, 80)}...</p>
      <div className="flex items-center gap-2 mt-2">
        <FiClock className="w-3 h-3" style={{ color: LI.textTertiary }} />
        <span className="text-xs" style={{ color: LI.textTertiary }}>{item.timestamp}</span>
      </div>
    </button>
  )
}

function AgentInfoPanel({ isActive }: { isActive: boolean }) {
  return (
    <div className="p-4" style={{ backgroundColor: LI.cardBg, borderRadius: '8px', boxShadow: LI.shadow }}>
      <div className="flex items-center gap-2 mb-3">
        <FiZap className="w-4 h-4" style={{ color: LI.textSecondary }} />
        <h4 className="text-xs font-semibold uppercase" style={{ color: LI.textSecondary }}>Agent Status</h4>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isActive ? '#e7a33e' : LI.green, animation: isActive ? 'pulse 2s infinite' : 'none' }} />
          <span className="text-xs font-semibold" style={{ color: LI.textPrimary }}>LinkedIn Content Agent</span>
        </div>
      </div>
      <p className="text-xs mt-2 leading-relaxed" style={{ color: LI.textSecondary }}>
        Generates post text, hashtags, hooks, and complementary images for LinkedIn.
      </p>
      <p className="text-xs mt-1 font-mono" style={{ color: LI.textTertiary }}>
        ID: {AGENT_ID.slice(0, 8)}...
      </p>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function Page() {
  // Form state
  const [formData, setFormData] = useState<FormState>({
    topic: '',
    style: 'thought-leadership',
    tone: 'professional',
  })

  // Post data
  const [postData, setPostData] = useState<PostData | null>(null)
  const [imageUrl, setImageUrl] = useState<string>('')
  const [editedText, setEditedText] = useState<string>('')

  // Loading / status
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRegeneratingText, setIsRegeneratingText] = useState(false)
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [postStatus, setPostStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [isAgentActive, setIsAgentActive] = useState(false)

  // History
  const [history, setHistory] = useState<HistoryItem[]>([])

  // Sample data toggle
  const [showSample, setShowSample] = useState(false)

  // Copy state
  const [copied, setCopied] = useState(false)

  // Confirm dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isPosting, setIsPosting] = useState(false)

  // Text editing
  const [isEditing, setIsEditing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Clear status after delay
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [statusMessage])
  useEffect(() => {
    if (postStatus) {
      const timer = setTimeout(() => setPostStatus(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [postStatus])

  // Sample data effect
  useEffect(() => {
    if (showSample) {
      setFormData({ topic: 'The future of AI in product management', style: 'thought-leadership', tone: 'professional' })
      setPostData({
        post_text: 'AI is not replacing product managers -- it is making the great ones even better.\n\nOver the past 6 months, I have integrated AI tools into every stage of our product development cycle. Here is what I have learned:\n\n1. Customer research that took weeks now takes hours\n2. Feature prioritization became data-driven, not gut-driven\n3. Sprint planning accuracy improved by 35%\n4. User feedback analysis went from quarterly to real-time\n\nBut here is the truth most people miss: AI amplifies your existing skills. If you do not understand your users deeply, no AI tool will save you.\n\nThe PMs who thrive in 2025 will be those who use AI as a co-pilot, not a replacement. They will spend less time on repetitive analysis and more time on creative strategy, stakeholder alignment, and building genuine user empathy.\n\nThe future belongs to augmented product managers.',
        hashtags: '#ProductManagement #AI #FutureOfWork #ProductStrategy #Innovation',
        hook_line: 'AI is not replacing product managers -- it is making the great ones even better.',
        call_to_action: 'How are you using AI in your PM workflow? Share your experience in the comments.',
        post_style: 'Thought Leadership',
        character_count: 847,
      })
      setEditedText('AI is not replacing product managers -- it is making the great ones even better.\n\nOver the past 6 months, I have integrated AI tools into every stage of our product development cycle. Here is what I have learned:\n\n1. Customer research that took weeks now takes hours\n2. Feature prioritization became data-driven, not gut-driven\n3. Sprint planning accuracy improved by 35%\n4. User feedback analysis went from quarterly to real-time\n\nBut here is the truth most people miss: AI amplifies your existing skills. If you do not understand your users deeply, no AI tool will save you.\n\nThe PMs who thrive in 2025 will be those who use AI as a co-pilot, not a replacement. They will spend less time on repetitive analysis and more time on creative strategy, stakeholder alignment, and building genuine user empathy.\n\nThe future belongs to augmented product managers.')
      setImageUrl('')
      setHistory(SAMPLE_POSTS)
    } else {
      setFormData({ topic: '', style: 'thought-leadership', tone: 'professional' })
      setPostData(null)
      setImageUrl('')
      setEditedText('')
      setHistory([])
    }
  }, [showSample])

  // Generate post (both text and image)
  const handleGenerate = useCallback(async () => {
    if (!formData.topic.trim()) {
      setStatusMessage({ type: 'error', message: 'Please enter a topic or idea for your post.' })
      return
    }
    setIsGenerating(true)
    setIsAgentActive(true)
    setStatusMessage(null)
    setPostData(null)
    setImageUrl('')
    setEditedText('')
    setIsEditing(false)
    try {
      const styleName = STYLE_OPTIONS.find((s) => s.value === formData.style)?.label ?? formData.style
      const toneName = TONE_OPTIONS.find((t) => t.value === formData.tone)?.label ?? formData.tone
      const message = `Generate a complete LinkedIn post about: ${formData.topic}. Style: ${styleName}. Tone: ${toneName}. Also generate a professional, eye-catching image that complements the post topic for LinkedIn.`
      const result = await callAIAgent(message, AGENT_ID)
      if (result?.success) {
        const parsed = parseAgentResponse(result)
        if (parsed) {
          setPostData(parsed)
          setEditedText(parsed.post_text)
        } else {
          setStatusMessage({ type: 'error', message: 'Could not parse agent response. Please try again.' })
        }
        const img = extractImageUrl(result)
        if (img) setImageUrl(img)
      } else {
        setStatusMessage({ type: 'error', message: result?.error ?? 'Failed to generate post. Please try again.' })
      }
    } catch {
      setStatusMessage({ type: 'error', message: 'Network error. Please check your connection and try again.' })
    } finally {
      setIsGenerating(false)
      setIsAgentActive(false)
    }
  }, [formData])

  // Regenerate text only
  const handleRegenerateText = useCallback(async () => {
    if (!formData.topic.trim()) return
    setIsRegeneratingText(true)
    setIsAgentActive(true)
    setIsEditing(false)
    try {
      const styleName = STYLE_OPTIONS.find((s) => s.value === formData.style)?.label ?? formData.style
      const toneName = TONE_OPTIONS.find((t) => t.value === formData.tone)?.label ?? formData.tone
      const message = `Generate a LinkedIn post about: ${formData.topic}. Style: ${styleName}. Tone: ${toneName}. Generate text only, no image needed.`
      const result = await callAIAgent(message, AGENT_ID)
      if (result?.success) {
        const parsed = parseAgentResponse(result)
        if (parsed) {
          setPostData(parsed)
          setEditedText(parsed.post_text)
        }
      }
    } catch {
      setStatusMessage({ type: 'error', message: 'Failed to regenerate text.' })
    } finally {
      setIsRegeneratingText(false)
      setIsAgentActive(false)
    }
  }, [formData])

  // Regenerate image only
  const handleRegenerateImage = useCallback(async () => {
    if (!formData.topic.trim()) return
    setIsRegeneratingImage(true)
    setIsAgentActive(true)
    try {
      const message = `Generate a professional image for a LinkedIn post about: ${formData.topic}. The image should be eye-catching and suitable for LinkedIn.`
      const result = await callAIAgent(message, AGENT_ID)
      if (result?.success) {
        const img = extractImageUrl(result)
        if (img) {
          setImageUrl(img)
        } else {
          setStatusMessage({ type: 'info', message: 'No image was returned. Try regenerating.' })
        }
      }
    } catch {
      setStatusMessage({ type: 'error', message: 'Failed to regenerate image.' })
    } finally {
      setIsRegeneratingImage(false)
      setIsAgentActive(false)
    }
  }, [formData])

  // Post to LinkedIn (simulated)
  const handlePostToLinkedIn = useCallback(() => {
    setIsPosting(true)
    setTimeout(() => {
      const ts = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
      const newEntry: HistoryItem = {
        id: generateId(),
        topic: formData.topic,
        postText: editedText || postData?.post_text || '',
        hashtags: postData?.hashtags ?? '',
        hookLine: postData?.hook_line ?? '',
        callToAction: postData?.call_to_action ?? '',
        postStyle: postData?.post_style ?? '',
        characterCount: postData?.character_count ?? 0,
        imageUrl: imageUrl,
        timestamp: ts,
      }
      setHistory((prev) => [newEntry, ...prev])
      setIsPosting(false)
      setShowConfirmDialog(false)
      setPostStatus({ type: 'success', message: 'Post published to LinkedIn successfully!' })
    }, 1500)
  }, [formData, postData, editedText, imageUrl])

  // Copy text
  const handleCopy = useCallback(() => {
    const text = editedText || postData?.post_text || ''
    if (text) {
      navigator.clipboard.writeText(text + '\n\n' + (postData?.hashtags ?? '')).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }, [editedText, postData])

  // Load from history
  const handleSelectHistory = useCallback((item: HistoryItem) => {
    setPostData({
      post_text: item.postText,
      hashtags: item.hashtags,
      hook_line: item.hookLine,
      call_to_action: item.callToAction,
      post_style: item.postStyle,
      character_count: item.characterCount,
    })
    setEditedText(item.postText)
    setImageUrl(item.imageUrl)
    setFormData((prev) => ({ ...prev, topic: item.topic }))
    setIsEditing(false)
  }, [])

  const displayText = editedText || postData?.post_text || ''
  const charCount = displayText.length
  const postsThisWeek = history.length
  const isAnyLoading = isGenerating || isRegeneratingText || isRegeneratingImage

  return (
    <div style={{ ...THEME_VARS, backgroundColor: LI.bg }} className="min-h-screen">
      {/* ── Header ── LinkedIn Nav Style ──────────────── */}
      <header style={{ backgroundColor: LI.cardBg, boxShadow: '0 1px 0 rgba(0,0,0,.08)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              {/* LinkedIn-style logo square */}
              <div className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: LI.blue, borderRadius: '4px' }}>
                <span className="text-white font-bold text-lg" style={{ fontFamily: 'serif', lineHeight: 1 }}>in</span>
              </div>
              <div>
                <h1 className="text-base font-serif font-bold tracking-tight" style={{ color: LI.textPrimary, letterSpacing: '-0.01em' }}>
                  Post Generator
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="sample-toggle" className="text-xs font-medium cursor-pointer" style={{ color: LI.textSecondary }}>Sample Data</Label>
              <Switch
                id="sample-toggle"
                checked={showSample}
                onCheckedChange={setShowSample}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Layout ─────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* ── LEFT: Compose Panel ─────────────────────── */}
          <div className="lg:col-span-3 space-y-5">
            {/* Start a Post Card */}
            <div className="overflow-hidden" style={{ backgroundColor: LI.cardBg, borderRadius: '8px', boxShadow: LI.shadow }}>
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: LI.blue }}>
                    <FiEdit2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold" style={{ color: LI.textPrimary }}>Create a post</h2>
                    <p className="text-xs" style={{ color: LI.textSecondary }}>Share your ideas with AI assistance</p>
                  </div>
                </div>
              </div>

              <div className="px-4 pb-4 space-y-4">
                {/* Topic Input */}
                <div>
                  <Textarea
                    id="topic"
                    value={formData.topic}
                    onChange={(e) => setFormData((prev) => ({ ...prev, topic: e.target.value.slice(0, 500) }))}
                    placeholder="What do you want to talk about?"
                    rows={4}
                    className="text-sm resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                    style={{ lineHeight: '1.6', color: LI.textPrimary }}
                  />
                  <div className="flex items-center justify-between mt-1">
                    <div className="h-0.5 flex-1 rounded-full" style={{ backgroundColor: LI.border }}>
                      <div className="h-0.5 rounded-full transition-all duration-300" style={{ backgroundColor: LI.blue, width: `${Math.min((formData.topic.length / 500) * 100, 100)}%` }} />
                    </div>
                    <span className="text-xs ml-2" style={{ color: LI.textTertiary }}>{formData.topic.length}/500</span>
                  </div>
                </div>

                {/* Style */}
                <div className="space-y-1.5">
                  <Label htmlFor="style" className="text-xs font-semibold" style={{ color: LI.textSecondary }}>Post Style</Label>
                  <Select value={formData.style} onValueChange={(val) => setFormData((prev) => ({ ...prev, style: val }))}>
                    <SelectTrigger className="text-sm h-9 border" style={{ borderColor: LI.border, borderRadius: '8px', color: LI.textPrimary }}>
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent style={{ borderRadius: '8px' }}>
                      {STYLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-sm">{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tone */}
                <div className="space-y-1.5">
                  <Label htmlFor="tone" className="text-xs font-semibold" style={{ color: LI.textSecondary }}>Tone</Label>
                  <Select value={formData.tone} onValueChange={(val) => setFormData((prev) => ({ ...prev, tone: val }))}>
                    <SelectTrigger className="text-sm h-9 border" style={{ borderColor: LI.border, borderRadius: '8px', color: LI.textPrimary }}>
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent style={{ borderRadius: '8px' }}>
                      {TONE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-sm">{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={isAnyLoading || !formData.topic.trim()}
                  className="w-full font-semibold text-sm text-white border-0"
                  style={{ backgroundColor: isAnyLoading || !formData.topic.trim() ? 'rgba(0,0,0,0.08)' : LI.blue, borderRadius: '24px', color: isAnyLoading || !formData.topic.trim() ? LI.textTertiary : '#ffffff' }}
                >
                  {isGenerating ? (
                    <LoadingSpinner text="Generating..." />
                  ) : (
                    <>
                      <FiZap className="w-4 h-4 mr-2" />
                      Generate Post
                    </>
                  )}
                </Button>

                {statusMessage && (
                  <StatusMessage type={statusMessage.type} message={statusMessage.message} />
                )}
              </div>
            </div>

            {/* Agent Info */}
            <AgentInfoPanel isActive={isAgentActive} />
          </div>

          {/* ── CENTER: LinkedIn Post Preview ─────────────────── */}
          <div className="lg:col-span-6">
            {isGenerating ? (
              <div className="overflow-hidden" style={{ backgroundColor: LI.cardBg, borderRadius: '8px', boxShadow: LI.shadow }}>
                <PostPreviewSkeleton />
              </div>
            ) : postData ? (
              <div className="overflow-hidden" style={{ backgroundColor: LI.cardBg, borderRadius: '8px', boxShadow: LI.shadow }}>
                {/* Top action bar */}
                <div className="flex items-center justify-between px-4 pt-3 pb-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsEditing(!isEditing)
                        if (!isEditing) {
                          setTimeout(() => textareaRef.current?.focus(), 50)
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-black/5"
                      style={{ color: LI.textSecondary, borderRadius: '16px' }}
                    >
                      <FiEdit2 className="w-3.5 h-3.5" />
                      {isEditing ? 'Done Editing' : 'Edit Text'}
                    </button>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-black/5"
                      style={{ color: LI.textSecondary, borderRadius: '16px' }}
                    >
                      {copied ? <FiCheck className="w-3.5 h-3.5" style={{ color: LI.green }} /> : <FiCopy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRegenerateText}
                      disabled={isAnyLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-black/5 disabled:opacity-40"
                      style={{ color: LI.blue, borderRadius: '16px' }}
                    >
                      <FiRefreshCw className={`w-3.5 h-3.5 ${isRegeneratingText ? 'animate-spin' : ''}`} />
                      Text
                    </button>
                    <button
                      onClick={handleRegenerateImage}
                      disabled={isAnyLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-black/5 disabled:opacity-40"
                      style={{ color: LI.blue, borderRadius: '16px' }}
                    >
                      <FiImage className={`w-3.5 h-3.5 ${isRegeneratingImage ? 'animate-spin' : ''}`} />
                      Image
                    </button>
                  </div>
                </div>

                <div className="h-px mx-4 my-2" style={{ backgroundColor: LI.border }} />

                {/* LinkedIn Post Card Content */}
                <div className="px-4 pt-2 pb-1">
                  {/* Profile header */}
                  <LinkedInMockProfile />

                  {/* Post text */}
                  <div className="mt-2">
                    {isEditing ? (
                      <Textarea
                        ref={textareaRef}
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        rows={12}
                        className="text-sm resize-none w-full border focus-visible:ring-1"
                        style={{ lineHeight: '1.6', color: LI.textPrimary, borderColor: LI.blue, borderRadius: '8px' }}
                      />
                    ) : (
                      <div className="text-sm" style={{ lineHeight: '1.6', color: LI.textPrimary, whiteSpace: 'pre-wrap' }}>
                        {renderMarkdown(displayText)}
                      </div>
                    )}
                  </div>

                  {/* Call to Action inline */}
                  {postData.call_to_action && !isEditing && (
                    <p className="text-sm mt-3" style={{ lineHeight: '1.6', color: LI.textPrimary }}>
                      {postData.call_to_action}
                    </p>
                  )}

                  {/* Hashtags - LinkedIn style (blue, inline) */}
                  {postData.hashtags && !isEditing && (
                    <HashtagDisplay hashtags={postData.hashtags} />
                  )}
                </div>

                {/* Generated Image - full bleed like LinkedIn */}
                <div className="mt-2">
                  {isRegeneratingImage ? (
                    <div className="flex items-center justify-center h-48" style={{ backgroundColor: '#f3f2ef' }}>
                      <LoadingSpinner text="Generating image..." />
                    </div>
                  ) : imageUrl ? (
                    <div className="relative group">
                      <img
                        src={imageUrl}
                        alt="Generated LinkedIn post image"
                        className="w-full object-cover"
                        style={{ maxHeight: '400px' }}
                      />
                      <button
                        onClick={handleRegenerateImage}
                        disabled={isAnyLoading}
                        className="absolute top-3 right-3 p-2 bg-white/90 transition-opacity opacity-0 group-hover:opacity-100"
                        style={{ borderRadius: '50%', boxShadow: LI.shadow }}
                      >
                        <FiRefreshCw className="w-4 h-4" style={{ color: LI.textSecondary }} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32 gap-2" style={{ backgroundColor: '#f3f2ef' }}>
                      <FiImage className="w-6 h-6" style={{ color: LI.textTertiary }} />
                      <p className="text-xs" style={{ color: LI.textTertiary }}>No image generated yet</p>
                    </div>
                  )}
                </div>

                {/* Metadata bar */}
                <div className="px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {postData.post_style && (
                      <span className="text-xs px-2 py-0.5 font-medium" style={{ color: LI.blue, backgroundColor: LI.blueLighter, borderRadius: '12px' }}>
                        {postData.post_style}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs ${charCount > 3000 ? 'text-red-600 font-semibold' : ''}`} style={charCount > 3000 ? {} : { color: LI.textTertiary }}>
                    {charCount} characters
                  </span>
                </div>

                {/* LinkedIn Reaction Bar */}
                <LinkedInReactionBar />
              </div>
            ) : (
              /* Empty state */
              <div className="overflow-hidden flex flex-col items-center justify-center py-16 px-6 text-center" style={{ backgroundColor: LI.cardBg, borderRadius: '8px', boxShadow: LI.shadow }}>
                <div className="w-16 h-16 flex items-center justify-center mb-5" style={{ backgroundColor: LI.blueLighter, borderRadius: '50%' }}>
                  <FiEdit2 className="w-7 h-7" style={{ color: LI.blue }} />
                </div>
                <h3 className="font-serif font-bold text-xl tracking-tight" style={{ color: LI.textPrimary }}>Your post preview will appear here</h3>
                <p className="text-sm mt-2 max-w-md leading-relaxed" style={{ color: LI.textSecondary }}>
                  Enter a topic on the left, choose your style and tone, then click Generate Post to create compelling LinkedIn content.
                </p>
              </div>
            )}
          </div>

          {/* ── RIGHT: Action Panel ───────────────────── */}
          <div className="lg:col-span-3 space-y-5">
            {/* Publish Card */}
            <div className="overflow-hidden" style={{ backgroundColor: LI.cardBg, borderRadius: '8px', boxShadow: LI.shadow }}>
              <div className="px-4 pt-4 pb-2">
                <h3 className="text-sm font-semibold" style={{ color: LI.textPrimary }}>Publish</h3>
              </div>
              <div className="px-4 pb-4 space-y-4">
                {/* Connection Status */}
                <div className="flex items-center justify-between py-2.5 px-3" style={{ backgroundColor: '#f0faf4', borderRadius: '8px' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: LI.green }} />
                    <span className="text-xs font-semibold" style={{ color: LI.green }}>LinkedIn Connected</span>
                  </div>
                  <FiCheck className="w-4 h-4" style={{ color: LI.green }} />
                </div>

                {/* Post to LinkedIn */}
                <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                  <DialogTrigger asChild>
                    <Button
                      disabled={!postData || isAnyLoading}
                      className="w-full font-semibold text-sm text-white border-0"
                      style={{ backgroundColor: !postData || isAnyLoading ? 'rgba(0,0,0,0.08)' : LI.blue, borderRadius: '24px', color: !postData || isAnyLoading ? LI.textTertiary : '#ffffff' }}
                    >
                      <FiSend className="w-4 h-4 mr-2" />
                      Post to LinkedIn
                    </Button>
                  </DialogTrigger>
                  <DialogContent style={{ borderRadius: '12px' }}>
                    <DialogHeader>
                      <DialogTitle className="font-serif tracking-tight" style={{ color: LI.textPrimary }}>Confirm Publication</DialogTitle>
                      <DialogDescription className="text-sm" style={{ color: LI.textSecondary, lineHeight: '1.6' }}>
                        Your post will be published to LinkedIn immediately. This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="p-3 mt-2" style={{ backgroundColor: '#f3f2ef', borderRadius: '8px' }}>
                      <p className="text-xs line-clamp-3" style={{ color: LI.textSecondary, lineHeight: '1.6' }}>
                        {displayText.slice(0, 200)}{displayText.length > 200 ? '...' : ''}
                      </p>
                    </div>
                    <DialogFooter className="mt-4 gap-2">
                      <Button variant="outline" onClick={() => setShowConfirmDialog(false)} style={{ borderRadius: '24px', borderColor: LI.border, color: LI.textSecondary }}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handlePostToLinkedIn}
                        disabled={isPosting}
                        className="text-white border-0"
                        style={{ backgroundColor: LI.blue, borderRadius: '24px' }}
                      >
                        {isPosting ? (
                          <LoadingSpinner text="Publishing..." />
                        ) : (
                          'Publish Now'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {postStatus && (
                  <StatusMessage type={postStatus.type} message={postStatus.message} />
                )}

                {/* Quick Stats */}
                <div className="h-px" style={{ backgroundColor: LI.border }} />
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: LI.textSecondary }}>Posts this session</span>
                  <span className="text-lg font-serif font-bold" style={{ color: LI.textPrimary }}>{postsThisWeek}</span>
                </div>
              </div>
            </div>

            {/* Post Details (when post exists) */}
            {postData && (
              <div className="overflow-hidden" style={{ backgroundColor: LI.cardBg, borderRadius: '8px', boxShadow: LI.shadow }}>
                <div className="px-4 pt-4 pb-2">
                  <h3 className="text-sm font-semibold" style={{ color: LI.textPrimary }}>Post Details</h3>
                </div>
                <div className="px-4 pb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: LI.textSecondary }}>Style</span>
                    <span className="text-xs px-2 py-0.5 font-medium" style={{ color: LI.blue, backgroundColor: LI.blueLighter, borderRadius: '12px' }}>{postData.post_style || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: LI.textSecondary }}>Characters</span>
                    <span className="text-xs font-mono" style={{ color: LI.textPrimary }}>{charCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: LI.textSecondary }}>Has Image</span>
                    <span className="text-xs" style={{ color: imageUrl ? LI.green : LI.textTertiary }}>{imageUrl ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="h-px" style={{ backgroundColor: LI.border }} />
                  {postData.hook_line && (
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: LI.textSecondary }}>Hook Line</p>
                      <p className="text-xs leading-relaxed" style={{ color: LI.textPrimary }}>{postData.hook_line}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: LI.textSecondary }}>Hashtags</p>
                    <p className="text-xs leading-relaxed" style={{ color: LI.blue }}>
                      {postData.hashtags || 'None'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Post History */}
            <div className="overflow-hidden" style={{ backgroundColor: LI.cardBg, borderRadius: '8px', boxShadow: LI.shadow }}>
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <FiClock className="w-3.5 h-3.5" style={{ color: LI.textSecondary }} />
                  <h3 className="text-sm font-semibold" style={{ color: LI.textPrimary }}>Post History</h3>
                </div>
              </div>
              <div>
                {history.length > 0 ? (
                  <ScrollArea className="max-h-64">
                    <div>
                      {history.map((item) => (
                        <div key={item.id} className="border-t" style={{ borderColor: LI.border }}>
                          <HistoryCard item={item} onSelect={handleSelectHistory} />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="p-6 text-center">
                    <FiClock className="w-5 h-5 mx-auto mb-2" style={{ color: LI.textTertiary }} />
                    <p className="text-xs" style={{ color: LI.textSecondary }}>No posts yet. Generate your first post to get started.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
