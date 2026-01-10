"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Loader2, Send, MessageSquare,
    Trash2, BookOpen, Paperclip, ExternalLink
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    ClassroomMessage,
    SharableNote,
    sendClassroomMessage,
    deleteClassroomMessage,
    getMessageReplies,
    shareNoteToClassroom
} from "@/app/(dashboard)/dashboard/student/classrooms/[classId]/classroom-stream-actions";
import { ShareNoteModal } from "./ShareNoteModal";

// Fallback for missing UI components
const MessageInput = ({
    value,
    onChange,
    onSubmit,
    isLoading,
    onAttachNote,
    placeholder = "Message the class..."
}: {
    value: string,
    onChange: (v: string) => void,
    onSubmit: () => void,
    isLoading: boolean,
    onAttachNote: () => void,
    placeholder?: string
}) => (
    <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm transition-all focus-within:border-indigo-400">
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSubmit();
                }
            }}
            placeholder={placeholder}
            className="w-full resize-none border-none bg-transparent p-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none min-h-[60px] max-h-[150px]"
            disabled={isLoading}
        />
        <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors flex items-center gap-2"
                    onClick={onAttachNote}
                    type="button"
                    title="Attach a note"
                >
                    <Paperclip className="h-4 w-4" />
                    <span className="text-xs font-medium">Attach Note</span>
                </Button>
            </div>
            <Button
                size="sm"
                onClick={onSubmit}
                disabled={!value.trim() || isLoading}
                className="h-9 rounded-full bg-indigo-600 px-5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 hover:shadow disabled:opacity-50 disabled:shadow-none transition-all"
            >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
        </div>
    </div>
);

// Attachment Viewer with Journal Card Style
const AttachmentView = ({ attachments }: { attachments: any[] }) => {
    const [expandedNote, setExpandedNote] = useState<any | null>(null);

    if (!attachments || attachments.length === 0) return null;

    return (
        <div className="mt-3 space-y-3">
            {attachments.map((att, i) => {
                if (att.type === 'note') {
                    const isBookNote = !!att.bookId;

                    return (
                        <div
                            key={i}
                            className="relative rounded-2xl border bg-gradient-to-br from-indigo-50/50 to-blue-50/50 border-indigo-100 p-4 shadow-sm hover:shadow-md transition-shadow"
                        >
                            {/* Header Tag */}
                            <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center">
                                        <span className="text-sm">📖</span>
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                                        {isBookNote ? "Reading Reflection" : "Quick Note"}
                                    </span>
                                </div>
                                {att.pageNumber && (
                                    <span className="text-xs font-medium text-indigo-400 bg-white/60 px-2 py-1 rounded-full">
                                        Page {att.pageNumber}
                                    </span>
                                )}
                            </div>

                            <div className="flex gap-4">
                                {/* Book Cover (if exists) */}
                                {isBookNote && (
                                    <div className="shrink-0">
                                        {att.bookCoverUrl ? (
                                            <div className="relative h-24 w-16 rounded-lg shadow-sm border border-black/5 overflow-hidden group-hover:scale-105 transition-transform duration-300">
                                                <Image
                                                    src={att.bookCoverUrl}
                                                    alt={att.bookTitle}
                                                    fill
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex h-24 w-16 items-center justify-center rounded-lg bg-indigo-100 text-indigo-300 border border-indigo-200">
                                                <BookOpen className="h-6 w-6" />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Content */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                    <div>
                                        {att.noteContent && (
                                            <div className="mb-2">
                                                <p className="text-sm text-indigo-950 italic line-clamp-3 leading-relaxed">
                                                    &quot;{att.noteContent}&quot;
                                                </p>
                                            </div>
                                        )}
                                        {isBookNote && (
                                            <h4 className="text-sm font-semibold text-indigo-900 truncate">
                                                {att.bookTitle}
                                            </h4>
                                        )}
                                    </div>

                                    <div className="mt-2 flex items-center gap-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="h-7 text-xs bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-100"
                                            onClick={() => setExpandedNote(att)}
                                        >
                                            Read Note
                                        </Button>

                                        {isBookNote && att.bookId && (
                                            <Link
                                                href={`/dashboard/student/read/${att.bookId}${att.pageNumber ? `?page=${att.pageNumber}` : ''}`}
                                            >
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs text-indigo-400 hover:text-indigo-700"
                                                >
                                                    Open Book
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                }
                return null;
            })}

            {/* Expanded Note Modal */}
            <Dialog open={!!expandedNote} onOpenChange={(open) => !open && setExpandedNote(null)}>
                <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-0 shadow-2xl bg-white/95 backdrop-blur-xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 pointer-events-none" />

                    <div className="relative flex flex-col h-full max-h-[85vh]">
                        {/* Header */}
                        <div className="p-6 pb-4 border-b border-indigo-50/50 flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                {expandedNote?.bookCoverUrl ? (
                                    <div className="relative h-12 w-8 rounded shadow-sm overflow-hidden">
                                        <Image
                                            src={expandedNote.bookCoverUrl}
                                            alt={expandedNote.bookTitle || "Book"}
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                    </div>
                                ) : (
                                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500">
                                        <span className="text-lg">📖</span>
                                    </div>
                                )}
                                <div>
                                    <DialogTitle className="text-lg font-bold text-indigo-950">
                                        {expandedNote?.bookTitle || "Note Details"}
                                    </DialogTitle>
                                    {expandedNote?.pageNumber && (
                                        <p className="text-sm text-indigo-500 font-medium">
                                            Page {expandedNote.pageNumber}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {/* Close button is handled by DialogPrimitive, but we can add custom one if needed or just rely on default X */}
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            <div className="prose prose-indigo max-w-none">
                                <p className="text-lg leading-relaxed text-indigo-900 font-serif italic whitespace-pre-wrap">
                                    &quot;{expandedNote?.noteContent}&quot;
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-indigo-50/50 bg-white/50 flex justify-end gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => setExpandedNote(null)}
                                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            >
                                Close
                            </Button>
                            {expandedNote?.bookId && (
                                <Link
                                    href={`/dashboard/student/read/${expandedNote.bookId}${expandedNote.pageNumber ? `?page=${expandedNote.pageNumber}` : ''}`}
                                >
                                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200">
                                        Open Book
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export function DiscussionStream({
    classId,
    initialMessages = [],
    currentUserId
}: {
    classId: number,
    initialMessages?: ClassroomMessage[],
    currentUserId: string
}) {
    const [messages, setMessages] = useState<ClassroomMessage[]>(initialMessages);
    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [activeThread, setActiveThread] = useState<string | null>(null); // message ID
    const [threadReplies, setThreadReplies] = useState<Record<string, ClassroomMessage[]>>({});
    const [replyInput, setReplyInput] = useState("");
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

    const router = useRouter();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Load messages on mount/update (optional polling or just initial)
    useEffect(() => {
        // In a real app we'd set up subscription or polling here
        setMessages(initialMessages);
    }, [initialMessages]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages.length, activeThread, threadReplies]);

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        setIsSending(true);
        try {
            const msg = await sendClassroomMessage({ classId, content: newMessage });
            setMessages([msg, ...messages]);
            setNewMessage("");
            // Refresh server data
            router.refresh();
        } catch (error) {
            console.error("Failed to send message", error);
        } finally {
            setIsSending(false);
        }
    };

    const loadReplies = async (messageId: string) => {
        if (threadReplies[messageId]) return; // already loaded

        try {
            const replies = await getMessageReplies(messageId);
            setThreadReplies(prev => ({ ...prev, [messageId]: replies }));
        } catch (error) {
            console.error("Failed to load replies", error);
        }
    };

    const toggleThread = async (messageId: string) => {
        if (activeThread === messageId) {
            setActiveThread(null);
        } else {
            setActiveThread(messageId);
            await loadReplies(messageId);
        }
    };

    const handleSendReply = async (parentId: string) => {
        if (!replyInput.trim()) return;

        setIsSending(true);
        try {
            const msg = await sendClassroomMessage({
                classId,
                content: replyInput,
                parentId
            });

            // Update local state
            setThreadReplies(prev => ({
                ...prev,
                [parentId]: [...(prev[parentId] || []), msg]
            }));
            setReplyInput("");
            router.refresh();
        } catch (error) {
            console.error("Replay failed", error);
        } finally {
            setIsSending(false);
        }
    };

    const handleDelete = async (messageId: string, isReply = false, parentId?: string) => {
        if (!confirm("Delete this message?")) return;

        try {
            await deleteClassroomMessage(messageId);
            if (isReply && parentId) {
                setThreadReplies(prev => ({
                    ...prev,
                    [parentId]: prev[parentId].filter(m => m.id !== messageId)
                }));
            } else {
                setMessages(prev => prev.filter(m => m.id !== messageId));
            }
            router.refresh();
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    const handleShareNote = async (note: SharableNote, comment: string) => {
        try {
            const msg = await shareNoteToClassroom({
                classId,
                noteId: note.id,
                additionalComment: comment
            });
            setMessages([msg, ...messages]);
            router.refresh();
        } catch (error) {
            console.error("Failed to share note", error);
            alert("Failed to share note. Please try again.");
        }
    };

    return (
        <div className="flex flex-col h-[600px] bg-white rounded-[24px] border border-indigo-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-indigo-50 bg-white z-10 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-bold text-indigo-950">Classroom Stream</h3>
                </div>
                <div className="text-xs text-indigo-400 font-medium">
                    {messages.length} messages
                </div>
            </div>

            {/* Messages List */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50 scroll-smooth"
            >
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                        <MessageSquare className="h-12 w-12 opacity-20" />
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className="group flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Avatar className="h-10 w-10 border border-white shadow-sm ring-1 ring-slate-100">
                                <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 text-xs font-bold">
                                    {msg.author_name?.substring(0, 2).toUpperCase() || "??"}
                                </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-sm text-indigo-950">
                                        {msg.author_name}
                                    </span>
                                    {msg.author_role === 'TEACHER' && (
                                        <span className="bg-indigo-100 text-indigo-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                            Teacher
                                        </span>
                                    )}
                                    <span className="text-xs text-slate-400">
                                        {new Date(msg.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {msg.author_id === currentUserId && (
                                        <button
                                            onClick={() => handleDelete(msg.id)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-slate-300 hover:text-red-400 p-1"
                                            title="Delete message"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>

                                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {msg.content}
                                </div>

                                <AttachmentView attachments={msg.attachments} />

                                {/* Thread Actions */}
                                <div className="flex items-center gap-4 mt-2">
                                    <button
                                        onClick={() => toggleThread(msg.id)}
                                        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors group/reply"
                                    >
                                        <MessageSquare className="h-3.5 w-3.5 group-hover/reply:fill-indigo-50" />
                                        {msg.reply_count ? `${msg.reply_count} replies` : "Reply"}
                                    </button>
                                </div>

                                {/* Thread View */}
                                {activeThread === msg.id && (
                                    <div className="mt-3 pl-4 border-l-2 border-indigo-100 space-y-4">
                                        {/* Replies List */}
                                        {threadReplies[msg.id]?.map(reply => (
                                            <div key={reply.id} className="flex gap-3">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarFallback className="text-[10px] bg-slate-100 text-slate-600">
                                                        {reply.author_name?.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-xs text-slate-900">{reply.author_name}</span>
                                                        <span className="text-[10px] text-slate-400">{new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        {reply.author_id === currentUserId && (
                                                            <button onClick={() => handleDelete(reply.id, true, msg.id)} className="ml-auto">
                                                                <Trash2 className="h-3 w-3 text-slate-300 hover:text-red-400" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-700 mt-0.5">{reply.content}</p>
                                                    <AttachmentView attachments={reply.attachments} />
                                                </div>
                                            </div>
                                        ))}

                                        {/* Reply Input */}
                                        <div className="mt-2">
                                            <MessageInput
                                                value={replyInput}
                                                onChange={setReplyInput}
                                                onSubmit={() => handleSendReply(msg.id)}
                                                isLoading={isSending}
                                                onAttachNote={() => { /* Note attaching in replies can be added later if needed */ }}
                                                placeholder="Write a reply..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Main Input Area */}
            <div className="p-4 bg-white border-t border-indigo-50">
                <MessageInput
                    value={newMessage}
                    onChange={setNewMessage}
                    onSubmit={handleSendMessage}
                    isLoading={isSending}
                    onAttachNote={() => setIsNoteModalOpen(true)}
                />
                <div className="text-center mt-2">
                    <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                        Tip: Click <Paperclip className="h-3 w-3" /> to share a note from your readings.
                    </p>
                </div>
            </div>

            <ShareNoteModal
                isOpen={isNoteModalOpen}
                onClose={() => setIsNoteModalOpen(false)}
                classId={classId}
                onShare={handleShareNote}
            />
        </div>
    );
}
