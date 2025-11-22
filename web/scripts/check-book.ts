import { getSupabaseAdminClient } from '../src/lib/supabase/admin';

const bookId = process.argv[2] ? parseInt(process.argv[2]) : 25;

async function checkBook() {
  const supabase = getSupabaseAdminClient();

  const { data: book, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Book details for ID', bookId);
  console.log('Title:', book.title);
  console.log('File format:', book.file_format);
  console.log('Page count:', book.page_count);
  console.log('Page images count:', book.page_images_count);
  console.log('Page images prefix:', book.page_images_prefix);
  console.log('Page images rendered at:', book.page_images_rendered_at);
  console.log('PDF URL:', book.pdf_url);
  console.log('Original file URL:', book.original_file_url);
}

checkBook();
