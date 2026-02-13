'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { FiEdit2, FiRefreshCw, FiSend, FiImage, FiCopy, FiCheck, FiUser, FiClock, FiZap } from 'react-icons/fi'

// ── Constants ──────────────────────────────────────────────────────────────

const AGENT_ID = '698efa107729fa642c1b3cf8'

const THEME_VARS: React.CSSProperties = {
  '--background': '0 0% 98%',
  '--foreground': '0 0% 8%',
  '--card': '0 0% 100%',
  '--card-foreground': '0 0% 8%',
  '--primary': '0 0% 8%',
  '--primary-foreground': '0 0% 98%',
  '--secondary': '0 0% 94%',
  '--secondary-foreground': '0 0% 12%',
  '--accent': '0 80% 45%',
  '--accent-foreground': '0 0% 98%',
  '--muted': '0 0% 92%',
  '--muted-foreground': '0 0% 40%',
  '--border': '0 0% 85%',
  '--input': '0 0% 80%',
  '--ring': '0 0% 8%',
  '--radius': '0rem',
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
      <FiRefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
      <span className="text-sm text-muted-foreground tracking-tight">{text}</span>
    </div>
  )
}

function StatusMessage({ type, message }: { type: 'success' | 'error' | 'info'; message: string }) {
  const colors = {
    success: 'text-green-700 bg-green-50 border-green-200',
    error: 'text-red-700 bg-red-50 border-red-200',
    info: 'text-blue-700 bg-blue-50 border-blue-200',
  }
  return (
    <div className={`px-3 py-2 text-xs border ${colors[type]} mt-2`}>
      {message}
    </div>
  )
}

function PostPreviewSkeleton() {
  return (
    <div className="space-y-4 p-6">
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
    <div className="flex items-center gap-3 mb-4">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border border-border">
        <FiUser className="w-5 h-5 text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold text-sm tracking-tight text-foreground">Your Name</p>
        <p className="text-xs text-muted-foreground">Your Headline | Your Company</p>
        <p className="text-xs text-muted-foreground mt-0.5">Just now</p>
      </div>
    </div>
  )
}

function HashtagBadges({ hashtags }: { hashtags: string }) {
  if (!hashtags) return null
  const tags = hashtags.split(/[\s,]+/).filter((t) => t.startsWith('#') || t.length > 0)
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {tags.map((tag, i) => {
        const cleanTag = tag.startsWith('#') ? tag : `#${tag}`
        return (
          <span key={i} className="text-xs font-medium tracking-tight" style={{ color: 'hsl(210, 80%, 45%)' }}>
            {cleanTag}
          </span>
        )
      })}
    </div>
  )
}

function HistoryCard({ item, onSelect }: { item: HistoryItem; onSelect: (item: HistoryItem) => void }) {
  return (
    <button
      onClick={() => onSelect(item)}
      className="w-full text-left p-3 border border-border bg-card hover:bg-secondary transition-colors"
    >
      <p className="text-xs font-semibold tracking-tight text-foreground truncate">{item.topic}</p>
      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{item.postText?.slice(0, 80)}...</p>
      <div className="flex items-center gap-2 mt-2">
        <FiClock className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{item.timestamp}</span>
      </div>
    </button>
  )
}

function AgentInfoPanel({ isActive }: { isActive: boolean }) {
  return (
    <div className="border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <FiZap className="w-4 h-4 text-muted-foreground" />
        <h4 className="text-xs font-semibold tracking-tight uppercase text-muted-foreground">Agent Status</h4>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
          <span className="text-xs font-medium text-foreground">LinkedIn Content Agent</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
        Generates post text, hashtags, hooks, and complementary images for LinkedIn.
      </p>
      <p className="text-xs text-muted-foreground mt-1 font-mono">
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
    <div style={THEME_VARS} className="min-h-screen bg-background text-foreground">
      {/* ── Header ──────────────────────────────────── */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground" style={{ letterSpacing: '-0.02em' }}>
              LinkedIn Post Generator
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 tracking-tight" style={{ lineHeight: '1.7' }}>
              Craft compelling posts with AI-powered content and visuals
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground font-medium cursor-pointer">Sample Data</Label>
            <Switch
              id="sample-toggle"
              checked={showSample}
              onCheckedChange={setShowSample}
            />
          </div>
        </div>
      </header>

      {/* ── Main Layout ─────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── LEFT: Input Panel ─────────────────────── */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="border border-border shadow-none rounded-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">Compose</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Enter your topic and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Topic */}
                <div className="space-y-2">
                  <Label htmlFor="topic" className="text-xs font-medium">Topic / Idea</Label>
                  <Textarea
                    id="topic"
                    value={formData.topic}
                    onChange={(e) => setFormData((prev) => ({ ...prev, topic: e.target.value.slice(0, 500) }))}
                    placeholder="e.g. Leadership lessons from scaling a startup to 100 employees..."
                    rows={4}
                    className="text-sm border-border rounded-none resize-none"
                    style={{ lineHeight: '1.7' }}
                  />
                  <p className="text-xs text-muted-foreground text-right">{formData.topic.length}/500</p>
                </div>

                {/* Style */}
                <div className="space-y-2">
                  <Label htmlFor="style" className="text-xs font-medium">Post Style</Label>
                  <Select value={formData.style} onValueChange={(val) => setFormData((prev) => ({ ...prev, style: val }))}>
                    <SelectTrigger className="rounded-none border-border text-sm">
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none">
                      {STYLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-sm">{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tone */}
                <div className="space-y-2">
                  <Label htmlFor="tone" className="text-xs font-medium">Tone</Label>
                  <Select value={formData.tone} onValueChange={(val) => setFormData((prev) => ({ ...prev, tone: val }))}>
                    <SelectTrigger className="rounded-none border-border text-sm">
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none">
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
                  className="w-full rounded-none bg-foreground text-background hover:bg-foreground/90 font-medium text-sm tracking-tight"
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
              </CardContent>
            </Card>

            {/* Agent Info */}
            <AgentInfoPanel isActive={isAgentActive} />
          </div>

          {/* ── CENTER: Preview Panel ─────────────────── */}
          <div className="lg:col-span-6">
            <Card className="border border-border shadow-none rounded-none">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">Post Preview</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">How your post will appear on LinkedIn</CardDescription>
                  </div>
                  {postData && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                        className="rounded-none border-border text-xs h-8"
                      >
                        {copied ? <FiCheck className="w-3 h-3 mr-1" /> : <FiCopy className="w-3 h-3 mr-1" />}
                        {copied ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <Separator className="bg-border" />
              <CardContent className="p-0">
                {isGenerating ? (
                  <PostPreviewSkeleton />
                ) : postData ? (
                  <div className="p-6">
                    {/* LinkedIn Mock Header */}
                    <LinkedInMockProfile />

                    {/* Hook Line */}
                    {postData.hook_line && (
                      <div className="mb-3 pb-3 border-b border-border">
                        <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground mb-1">Hook</p>
                        <p className="text-sm font-semibold text-foreground" style={{ lineHeight: '1.7' }}>
                          {postData.hook_line}
                        </p>
                      </div>
                    )}

                    {/* Post Text (editable) */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">Post Body</p>
                        <button
                          onClick={() => {
                            setIsEditing(!isEditing)
                            if (!isEditing) {
                              setTimeout(() => textareaRef.current?.focus(), 50)
                            }
                          }}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <FiEdit2 className="w-3 h-3" />
                          {isEditing ? 'Done' : 'Edit'}
                        </button>
                      </div>
                      {isEditing ? (
                        <Textarea
                          ref={textareaRef}
                          value={editedText}
                          onChange={(e) => setEditedText(e.target.value)}
                          rows={12}
                          className="text-sm rounded-none border-border resize-none w-full"
                          style={{ lineHeight: '1.7' }}
                        />
                      ) : (
                        <div className="text-sm text-foreground" style={{ lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                          {renderMarkdown(displayText)}
                        </div>
                      )}
                    </div>

                    {/* Hashtags */}
                    {postData.hashtags && (
                      <HashtagBadges hashtags={postData.hashtags} />
                    )}

                    {/* Call to Action */}
                    {postData.call_to_action && (
                      <div className="mt-4 pt-3 border-t border-border">
                        <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground mb-1">Call to Action</p>
                        <p className="text-sm text-foreground italic" style={{ lineHeight: '1.7' }}>
                          {postData.call_to_action}
                        </p>
                      </div>
                    )}

                    {/* Generated Image */}
                    <div className="mt-4">
                      {isRegeneratingImage ? (
                        <div className="border border-border bg-muted flex items-center justify-center h-48">
                          <LoadingSpinner text="Generating image..." />
                        </div>
                      ) : imageUrl ? (
                        <div className="relative group border border-border overflow-hidden">
                          <img
                            src={imageUrl}
                            alt="Generated LinkedIn post image"
                            className="w-full object-cover"
                            style={{ maxHeight: '400px' }}
                          />
                          <button
                            onClick={handleRegenerateImage}
                            disabled={isAnyLoading}
                            className="absolute top-2 right-2 p-2 bg-foreground/70 text-background rounded-none opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <FiRefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="border border-dashed border-border bg-muted/50 flex flex-col items-center justify-center h-36 gap-2">
                          <FiImage className="w-6 h-6 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">No image generated yet</p>
                        </div>
                      )}
                    </div>

                    {/* Metadata Row */}
                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        {postData.post_style && (
                          <Badge variant="outline" className="rounded-none text-xs border-border font-normal">
                            {postData.post_style}
                          </Badge>
                        )}
                        <span className={`text-xs font-mono ${charCount > 3000 ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {charCount} chars
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRegenerateText}
                          disabled={isAnyLoading}
                          className="rounded-none border-border text-xs h-8"
                        >
                          {isRegeneratingText ? (
                            <FiRefreshCw className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <FiRefreshCw className="w-3 h-3 mr-1" />
                          )}
                          Regen Text
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRegenerateImage}
                          disabled={isAnyLoading}
                          className="rounded-none border-border text-xs h-8"
                        >
                          {isRegeneratingImage ? (
                            <FiRefreshCw className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <FiImage className="w-3 h-3 mr-1" />
                          )}
                          Regen Image
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 border border-border bg-muted flex items-center justify-center mb-4">
                      <FiEdit2 className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-serif font-semibold text-lg text-foreground tracking-tight">Your post preview will appear here</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-md" style={{ lineHeight: '1.7' }}>
                      Enter a topic on the left, choose your style and tone, then click Generate Post to create compelling LinkedIn content.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT: Action Panel ───────────────────── */}
          <div className="lg:col-span-3 space-y-4">
            {/* Connection & Publish */}
            <Card className="border border-border shadow-none rounded-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">Publish</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Connection Status */}
                <div className="flex items-center justify-between py-2 px-3 border border-border bg-secondary/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs font-medium text-foreground">LinkedIn Connected</span>
                  </div>
                  <FiCheck className="w-4 h-4 text-green-600" />
                </div>

                {/* Post to LinkedIn */}
                <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                  <DialogTrigger asChild>
                    <Button
                      disabled={!postData || isAnyLoading}
                      className="w-full rounded-none font-medium text-sm tracking-tight"
                      style={{ backgroundColor: 'hsl(0, 80%, 45%)', color: 'hsl(0, 0%, 98%)' }}
                    >
                      <FiSend className="w-4 h-4 mr-2" />
                      Post to LinkedIn
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-none border-border">
                    <DialogHeader>
                      <DialogTitle className="font-serif tracking-tight">Confirm Publication</DialogTitle>
                      <DialogDescription className="text-sm text-muted-foreground" style={{ lineHeight: '1.7' }}>
                        Your post will be published to LinkedIn immediately. This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="border border-border p-3 bg-secondary/30 mt-2">
                      <p className="text-xs text-muted-foreground line-clamp-3" style={{ lineHeight: '1.7' }}>
                        {displayText.slice(0, 200)}{displayText.length > 200 ? '...' : ''}
                      </p>
                    </div>
                    <DialogFooter className="mt-4 gap-2">
                      <Button variant="outline" className="rounded-none border-border" onClick={() => setShowConfirmDialog(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handlePostToLinkedIn}
                        disabled={isPosting}
                        className="rounded-none"
                        style={{ backgroundColor: 'hsl(0, 80%, 45%)', color: 'hsl(0, 0%, 98%)' }}
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
                <Separator className="bg-border" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Posts this week</span>
                  <span className="text-lg font-serif font-bold text-foreground">{postsThisWeek}</span>
                </div>
              </CardContent>
            </Card>

            {/* Post Details (when post exists) */}
            {postData && (
              <Card className="border border-border shadow-none rounded-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">Post Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Style</span>
                    <Badge variant="outline" className="rounded-none text-xs border-border font-normal">{postData.post_style || 'N/A'}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Characters</span>
                    <span className="text-xs font-mono text-foreground">{charCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Has Image</span>
                    <span className="text-xs text-foreground">{imageUrl ? 'Yes' : 'No'}</span>
                  </div>
                  <Separator className="bg-border" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Hashtags</p>
                    <p className="text-xs text-foreground" style={{ lineHeight: '1.7' }}>
                      {postData.hashtags || 'None'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Post History */}
            <Card className="border border-border shadow-none rounded-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <FiClock className="w-3.5 h-3.5" />
                    Post History
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {history.length > 0 ? (
                  <ScrollArea className="max-h-64">
                    <div className="space-y-0">
                      {history.map((item) => (
                        <div key={item.id} className="border-t border-border first:border-t-0">
                          <HistoryCard item={item} onSelect={handleSelectHistory} />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="p-6 text-center">
                    <FiClock className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No posts yet. Generate your first post to get started.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
