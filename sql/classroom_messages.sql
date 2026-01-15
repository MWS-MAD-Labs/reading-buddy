-- =============================================
-- Classroom Messages - Discussion Stream
-- =============================================

-- Classroom messages table with threading support
CREATE TABLE IF NOT EXISTS classroom_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES classroom_messages(id) ON DELETE CASCADE,
  attachments JSONB DEFAULT '[]', -- [{ type: 'note', noteId: '...', bookTitle: '...' }]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_classroom_messages_class ON classroom_messages(class_id);
CREATE INDEX IF NOT EXISTS idx_classroom_messages_parent ON classroom_messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_classroom_messages_author ON classroom_messages(author_id);
CREATE INDEX IF NOT EXISTS idx_classroom_messages_created ON classroom_messages(class_id, created_at DESC);

-- Enable RLS
ALTER TABLE classroom_messages ENABLE ROW LEVEL SECURITY;

-- Policies: Class members can view messages
CREATE POLICY "Class members can view messages"
  ON classroom_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_students cs
      WHERE cs.class_id = classroom_messages.class_id
      AND cs.student_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = classroom_messages.class_id
      AND c.teacher_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('ADMIN', 'LIBRARIAN')
    )
  );

-- Policies: Class members can insert messages
CREATE POLICY "Class members can insert messages"
  ON classroom_messages
  FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM class_students cs
        WHERE cs.class_id = classroom_messages.class_id
        AND cs.student_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM classes c
        WHERE c.id = classroom_messages.class_id
        AND c.teacher_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('ADMIN', 'LIBRARIAN')
      )
    )
  );

-- Policies: Authors can update their own messages
CREATE POLICY "Authors can update own messages"
  ON classroom_messages
  FOR UPDATE
  USING (author_id = auth.uid());

-- Policies: Authors can delete their own messages, teachers can delete any in their class
CREATE POLICY "Authors and teachers can delete messages"
  ON classroom_messages
  FOR DELETE
  USING (
    author_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = classroom_messages.class_id
      AND c.teacher_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'ADMIN'
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_classroom_messages_updated_at
  BEFORE UPDATE ON classroom_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
