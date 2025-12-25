"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Trash2, Star, Share2, Edit2, LogOut, Settings, Sun, Moon, Server, User, Copy } from "lucide-react"
import type { ChatSession } from "@/types/runash-chat"

interface ChatSidebarProps {
  onSessionSelect: (session: ChatSession) => void
  currentSession: ChatSession | null
}

// Extended session used locally (adds UI-only fields)
type LocalSession = ChatSession & {
  favorite?: boolean
  model?: string
}

const SESSIONS_KEY = "runash_chat_sessions_v1"
const SETTINGS_KEY = "runash_chat_settings_v1"

export default function ChatSidebar({ onSessionSelect, currentSession }: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sessions, setSessions] = useState<LocalSession[]>([])
  const [filterRecent, setFilterRecent] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [user, setUser] = useState<{ name: string; email?: string; avatarUrl?: string } | null>(null)
  const [settings, setSettings] = useState<{ theme: "light" | "dark"; mcpServer: string; freeUsage: boolean }>(() => ({ theme: "light", mcpServer: "", freeUsage: true }))

  // Load sessions from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSIONS_KEY)
      if (raw) {
        const parsed: LocalSession[] = JSON.parse(raw)
        // revive dates
        parsed.forEach((s) => {
          s.createdAt = new Date(s.createdAt as unknown as string)
          s.updatedAt = new Date(s.updatedAt as unknown as string)
        })
        setSessions(parsed)
      } else {
        // seed with some starter sessions (if none exist)
        const seed: LocalSession[] = [
          {
            id: "1",
            title: "Organic Breakfast Ideas",
            messages: [],
            createdAt: new Date(Date.now() - 86400000),
            updatedAt: new Date(Date.now() - 86400000),
            context: {
              preferences: {
                dietaryRestrictions: ["vegan"],
                sustainabilityPriority: "high",
                budgetRange: [0, 50],
                preferredCategories: ["fruits-vegetables"],
                cookingSkillLevel: "beginner",
              },
              currentCart: [],
              recentSearches: ["organic oats", "plant milk"],
            },
            favorite: false,
            model: "gpt-4o-mini",
          },
          {
            id: "2",
            title: "Store Automation Setup",
            messages: [],
            createdAt: new Date(Date.now() - 172800000),
            updatedAt: new Date(Date.now() - 172800000),
            context: {
              preferences: {
                dietaryRestrictions: [],
                sustainabilityPriority: "medium",
                budgetRange: [0, 1000],
                preferredCategories: [],
                cookingSkillLevel: "intermediate",
                businessType: "retail",
              },
              currentCart: [],
              recentSearches: ["inventory management", "POS system"],
            },
            favorite: true,
            model: "gpt-4o-mini",
          },
        ]
        setSessions(seed)
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(seed))
      }
    } catch (e) {
      console.error("Failed to load sessions", e)
    }

    try {
      const rawSettings = localStorage.getItem(SETTINGS_KEY)
      if (rawSettings) setSettings(JSON.parse(rawSettings))
    } catch (e) {
      console.error("Failed to load settings", e)
    }

    // fake current user (replace with real auth integration)
    setUser({ name: "Vaibhav Murmu", email: "vaibhav@example.com", avatarUrl: undefined })
  }, [])

  // persist changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
    } catch (e) {
      console.error("Failed to persist sessions", e)
    }
  }, [sessions])

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
      // apply theme class to <html>
      if (settings.theme === "dark") document.documentElement.classList.add("dark")
      else document.documentElement.classList.remove("dark")
    } catch (e) {
      console.error("Failed to persist settings", e)
    }
  }, [settings])

  const filteredSessions = sessions
    .filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      // If filtering recent, sort by updatedAt desc, else favorites first then updatedAt
      if (filterRecent) return b.updatedAt.getTime() - a.updatedAt.getTime()
      if (a.favorite && !b.favorite) return -1
      if (!a.favorite && b.favorite) return 1
      return b.updatedAt.getTime() - a.updatedAt.getTime()
    })

  const handleNewChat = async () => {
    const title = prompt("New chat name:", "New Chat") || `Chat ${sessions.length + 1}`
    const id = Date.now().toString()
    const now = new Date()
    const newSession: LocalSession = {
      id,
      title,
      messages: [],
      createdAt: now,
      updatedAt: now,
      context: { preferences: { dietaryRestrictions: [], sustainabilityPriority: "medium", budgetRange: [0, 100], preferredCategories: [], cookingSkillLevel: "intermediate" }, currentCart: [], recentSearches: [] },
      favorite: false,
      model: "gpt-4o-mini",
    }
    setSessions((s) => [newSession, ...s])
    onSessionSelect(newSession)
  }

  const handleDeleteSession = (sessionId: string) => {
    setSessionToDelete(sessionId)
    setShowDeleteModal(true)
  }

  const confirmDelete = () => {
    if (!sessionToDelete) return
    setSessions((s) => s.filter((x) => x.id !== sessionToDelete))
    if (currentSession?.id === sessionToDelete) onSessionSelect(null as unknown as ChatSession)
    setSessionToDelete(null)
    setShowDeleteModal(false)
  }

  const handleRename = (session: LocalSession) => {
    const newTitle = prompt("Rename chat", session.title)
    if (!newTitle) return
    setSessions((s) => s.map((x) => (x.id === session.id ? { ...x, title: newTitle, updatedAt: new Date() } : x)))
  }

  const toggleFavorite = (sessionId: string) => {
    setSessions((s) => s.map((x) => (x.id === sessionId ? { ...x, favorite: !x.favorite, updatedAt: new Date() } : x)))
  }

  const shareSession = async (sessionId: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set("sessionId", sessionId)
    try {
      await navigator.clipboard.writeText(url.toString())
      alert("Shareable link copied to clipboard")
    } catch (e) {
      console.warn("Clipboard failed, showing link instead", e)
      prompt("Share this link:", url.toString())
    }
  }

  const toggleTheme = () => setSettings((s) => ({ ...s, theme: s.theme === "light" ? "dark" : "light" }))

  const updateMcpServer = () => {
    const val = prompt("MCP Server URL:", settings.mcpServer)
    if (val === null) return
    setSettings((s) => ({ ...s, mcpServer: val }))
  }

  const toggleFreeUsage = () => setSettings((s) => ({ ...s, freeUsage: !s.freeUsage }))

  const signOut = () => {
    // clear user session (replace with real sign-out flow)
    setUser(null)
    setShowSignOutModal(false)
    alert("Signed out")
  }

  const updateModelForSession = (sessionId: string, model: string) => {
    setSessions((s) => s.map((x) => (x.id === sessionId ? { ...x, model, updatedAt: new Date() } : x)))
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-1 rounded-full bg-muted text-muted-foreground">
              <User className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Chat History</CardTitle>
              <div className="text-xs text-muted-foreground">
                {user ? user.name : "Guest"}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button size="sm" onClick={handleNewChat}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowSignOutModal(true)}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Button size="sm" variant={filterRecent ? "default" : "ghost"} onClick={() => setFilterRecent(true)}>Recent</Button>
          <Button size="sm" variant={!filterRecent ? "default" : "ghost"} onClick={() => setFilterRecent(false)}>All / Favorites</Button>
          <Button size="sm" variant="ghost" onClick={() => { setSettings((s) => ({ ...s, theme: s.theme === "light" ? "dark" : "light" })) }}>
            {settings.theme === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="space-y-2 p-3">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className={`group relative rounded-lg border p-3 cursor-pointer transition-colors hover:bg-muted/50 ${currentSession?.id === session.id ? "bg-muted border-orange-500" : ""}`}
                onClick={() => onSessionSelect(session)}
              >
                <div className="flex items-start space-x-3">
                  <div className="text-lg">{session.context?.preferences?.businessType ? "🏪" : session.context?.preferences?.sustainabilityPriority === "high" ? "🌱" : "💬"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm truncate">{session.title}</h4>
                      <div className="flex items-center gap-1">
                        <select
                          value={session.model || "gpt-4o-mini"}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateModelForSession(session.id, e.target.value)}
                          className="text-xs bg-transparent border rounded px-2 py-1"
                        >
                          <option value="gpt-4o-mini">gpt-4o-mini</option>
                          <option value="gpt-4o">gpt-4o</option>
                          <option value="gpt-3.5">gpt-3.5</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{session.updatedAt.toLocaleString()}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {session.context?.preferences?.businessType && (
                        <Badge variant="outline" className="text-xs">Business</Badge>
                      )}
                      {session.context?.preferences?.sustainabilityPriority === "high" && (
                        <Badge variant="outline" className="text-xs">Eco-focused</Badge>
                      )}
                      {(session.context?.preferences?.dietaryRestrictions || []).length > 0 && (
                        <Badge variant="outline" className="text-xs">Dietary</Badge>
                      )}
                      {session.favorite && (
                        <Badge variant="outline" className="text-xs">★ Favorite</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(session.id) }}
                    title={session.favorite ? "Unfavorite" : "Favorite"}
                  >
                    <Star className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleRename(session) }}
                    title="Rename"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); shareSession(session.id) }}
                    title="Share"
                  >
                    <Share2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id) }}
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            {filteredSessions.length === 0 && (
              <div className="text-center text-sm text-muted-foreground">No chats found</div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteModal(false)} />
          <div className="bg-background rounded p-4 z-10 w-[90%] max-w-md">
            <h3 className="text-lg font-medium">Delete chat</h3>
            <p className="text-sm text-muted-foreground mt-2">Are you sure you want to delete this chat? This action cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Sign out modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSignOutModal(false)} />
          <div className="bg-background rounded p-4 z-10 w-[90%] max-w-md">
            <h3 className="text-lg font-medium">Sign out</h3>
            <p className="text-sm text-muted-foreground mt-2">Do you want to sign out from your account?</p>
            <div className="mt-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                <div className="text-sm">MCP: <span className="font-medium">{settings.mcpServer || "Not configured"}</span></div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setShowSignOutModal(false)}>Cancel</Button>
                <Button variant="destructive" onClick={signOut}>Sign out</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick settings drawer (small) */}
      <div className="p-3 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <div className="text-sm font-medium">Settings</div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={updateMcpServer} title="Set MCP Server">
              <Server className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard?.writeText(JSON.stringify({ sessionsCount: sessions.length })) }} title="Export">
              <Copy className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={toggleFreeUsage} title="Toggle free usage">
              {settings.freeUsage ? "Free" : "Paid"}
            </Button>
            <Button size="sm" variant="ghost" onClick={toggleTheme} title="Toggle theme">
              {settings.theme === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
