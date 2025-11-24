import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 表示する最大記事数
const MAX_NEWS_ITEMS = 8;

/**
 * postsフォルダから全記事情報を取得
 */
function getAllPosts() {
  const postsDir = join(__dirname, '..', '..', 'posts');
  const posts = [];

  if (!existsSync(postsDir)) {
    console.log('⚠️ postsフォルダが見つかりません');
    return posts;
  }

  const files = readdirSync(postsDir).filter(f => f.endsWith('.html'));

  for (const file of files) {
    const filePath = join(postsDir, file);
    const content = readFileSync(filePath, 'utf-8');

    // タイトルを抽出
    const titleMatch = content.match(/<title>([^<]+)\s*-\s*if\(塾\)<\/title>/);
    const title = titleMatch ? titleMatch[1].trim() : file.replace('.html', '');

    // 日付を抽出
    const dateMatch = content.match(/(\d{4})年(\d{2})月(\d{2})日/);
    let date = '2024年01月01日';
    let sortDate = '2024-01-01';
    if (dateMatch) {
      date = `${dateMatch[1]}年${dateMatch[2]}月${dateMatch[3]}日`;
      sortDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    }

    // カテゴリを抽出
    const categoryMatches = content.match(/<span class="category-tag">([^<]+)<\/span>/g);
    const categories = categoryMatches
      ? categoryMatches.map(m => m.match(/>([^<]+)</)[1])
      : ['未分類'];

    // 抜粋を抽出
    const excerptMatch = content.match(/<div class="post-content">([\s\S]*?)<\/div>/);
    let excerpt = '';
    if (excerptMatch) {
      // HTMLタグを除去し、最初の200文字を取得
      excerpt = excerptMatch[1]
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 200);
      if (excerptMatch[1].length > 200) excerpt += '...';
    }

    posts.push({
      file,
      title,
      date,
      sortDate,
      categories,
      excerpt
    });
  }

  // 日付でソート（新しい順）
  posts.sort((a, b) => b.sortDate.localeCompare(a.sortDate));

  return posts;
}

/**
 * 記事カードのHTMLを生成
 */
function generatePostCard(post) {
  const categoriesHTML = post.categories
    .map(cat => `<span class="category-tag">${cat}</span>`)
    .join('');

  return `
        <div class="post-card">
            <div class="post-card-header">
                <h3 class="post-card-title">
                    <a href="posts/${post.file}">${post.title}</a>
                </h3>
                <div class="post-card-meta">
                    <span class="post-date">${post.date}</span>
                    <div class="post-categories">
                        ${categoriesHTML}
                    </div>
                </div>
            </div>
            <div class="post-card-excerpt">
                ${post.excerpt}
            </div>
            <a href="posts/${post.file}" class="post-card-link">続きを読む →</a>
        </div>`;
}

/**
 * news.htmlを更新
 */
function updateNewsPage() {
  console.log('📄 news.htmlを更新中...\n');

  const newsPath = join(__dirname, '..', '..', 'news.html');

  if (!existsSync(newsPath)) {
    console.error('❌ news.htmlが見つかりません');
    process.exit(1);
  }

  // 全記事を取得
  const posts = getAllPosts();
  console.log(`📊 ${posts.length}件の記事を検出\n`);

  // 記事カードを生成
  const postsHTML = posts.map(post => generatePostCard(post)).join('\n');

  // news.htmlを読み込む
  let newsContent = readFileSync(newsPath, 'utf-8');

  // posts-gridの内容を置換
  const gridRegex = /(<div class="posts-grid">)[\s\S]*?(<\/div>\s*<\/div>\s*<script>)/;
  newsContent = newsContent.replace(gridRegex, `$1\n            ${postsHTML}\n        $2`);

  // ファイルを保存
  writeFileSync(newsPath, newsContent);

  console.log('✅ news.htmlを更新しました');
  console.log(`📊 総記事数: ${posts.length}件\n`);

  // 最新5件を表示
  console.log('📰 最新記事:');
  posts.slice(0, 5).forEach((post, i) => {
    console.log(`  ${i + 1}. ${post.title} (${post.date})`);
  });

  return posts;
}

/**
 * index.htmlのお知らせセクションを更新
 */
function updateIndexPage(posts) {
  console.log('\n📄 index.htmlのお知らせセクションを更新中...\n');

  const indexPath = join(__dirname, '..', '..', 'index.html');

  if (!existsSync(indexPath)) {
    console.error('❌ index.htmlが見つかりません');
    return;
  }

  let indexContent = readFileSync(indexPath, 'utf-8');

  // 最新のニュース記事を取得（最大MAX_NEWS_ITEMS件）
  const latestNews = posts.slice(0, MAX_NEWS_ITEMS);

  // titleToFilenameMappingを更新
  // News section mappingsの部分を見つけて更新
  const newsMappings = latestNews.map(post => {
    const escapedTitle = post.title.replace(/'/g, "\\'");
    return `            '${escapedTitle}': '${post.file}'`;
  }).join(',\n');

  // News section mappingsを更新
  const mappingRegex = /(\/\/ News section mappings\s*\n)([\s\S]*?)(        \};)/;
  const mappingMatch = indexContent.match(mappingRegex);

  if (mappingMatch) {
    // Materials mappingsを保持しつつNews mappingsを更新
    const beforeNews = indexContent.substring(0, indexContent.indexOf('// News section mappings'));
    const afterMapping = indexContent.substring(indexContent.indexOf('};', indexContent.indexOf('// News section mappings')) + 2);

    indexContent = beforeNews + `// News section mappings  \n${newsMappings}\n        ` + '}' + afterMapping;
  }

  // newsDataを更新
  const newsDataItems = latestNews.map(post => {
    const escapedTitle = post.title.replace(/'/g, "\\'");
    const escapedExcerpt = post.excerpt.replace(/'/g, "\\'").substring(0, 100);
    return `                { title: '${escapedTitle}', excerpt: '${escapedExcerpt}' }`;
  }).join(',\n');

  // newsData配列を更新
  const newsDataRegex = /(\/\/ Fixed news\s*\n\s*const newsData = \[)\n[\s\S]*?(\];)/;
  indexContent = indexContent.replace(newsDataRegex, `$1\n${newsDataItems}\n            $2`);

  // ファイルを保存
  writeFileSync(indexPath, indexContent);

  console.log('✅ index.htmlのお知らせセクションを更新しました');
  console.log(`📊 表示記事数: ${latestNews.length}件`);
}

// 実行
const posts = updateNewsPage();
if (posts && posts.length > 0) {
  updateIndexPage(posts);
}
