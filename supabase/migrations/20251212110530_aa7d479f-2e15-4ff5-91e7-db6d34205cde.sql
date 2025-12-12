-- Add RLS policies for knowledge_topics management by authenticated users
CREATE POLICY "Authenticated users can insert knowledge topics"
ON public.knowledge_topics
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update knowledge topics"
ON public.knowledge_topics
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete knowledge topics"
ON public.knowledge_topics
FOR DELETE
TO authenticated
USING (true);

-- Add RLS policies for knowledge_categories management by authenticated users
CREATE POLICY "Authenticated users can insert categories"
ON public.knowledge_categories
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
ON public.knowledge_categories
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete categories"
ON public.knowledge_categories
FOR DELETE
TO authenticated
USING (true);