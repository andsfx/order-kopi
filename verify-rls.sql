-- Verify order_items RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual IS NOT NULL as has_using_clause,
  with_check IS NOT NULL as has_with_check
FROM pg_policies 
WHERE tablename = 'order_items'
ORDER BY policyname;
