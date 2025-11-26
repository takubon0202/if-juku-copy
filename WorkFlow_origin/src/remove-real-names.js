import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 名前の置換ルール
const NAME_REPLACEMENTS = [
  // 塾頭
  { pattern: /高崎翔太/g, replacement: '塾頭' },
  { pattern: /塾頭高崎翔太/g, replacement: '塾頭' },
  { pattern: /高崎先生/g, replacement: '塾頭' },

  // 塾長
  { pattern: /山﨑琢己/g, replacement: '塾長' },
  { pattern: /塾長山﨑琢己/g, replacement: '塾長' },
  { pattern: /山﨑塾長/g, replacement: '塾長' },

  // CTO
  { pattern: /井上陽斗/g, replacement: 'CTO' },
  { pattern: /CTO井上陽斗/g, replacement: 'CTO' },
  { pattern: /井上CTO/g, replacement: 'CTO' },

  // 学生起業家
  { pattern: /加賀屋結眞/g, replacement: '学生起業家' },
  { pattern: /学生起業家加賀屋結眞/g, replacement: '学生起業家' },
  { pattern: /加賀屋/g, replacement: '学生起業家' },

  // eスポーツプレイヤー
  { pattern: /渡辺柚気/g, replacement: 'Y君' },
  { pattern: /eスポーツプレイヤー渡辺柚気/g, replacement: 'Y君' },
  { pattern: /渡辺/g, replacement: 'Y君' }
];

/**
 * HTMLファイルから本名を削除
 */
function removeRealNamesFromFile(filePath) {
  try {
    let content = readFileSync(filePath, 'utf-8');
    let hasChanges = false;
    let changeCount = 0;

    // 各置換ルールを適用
    NAME_REPLACEMENTS.forEach(rule => {
      const matches = content.match(rule.pattern);
      if (matches && matches.length > 0) {
        content = content.replace(rule.pattern, rule.replacement);
        hasChanges = true;
        changeCount += matches.length;
      }
    });

    if (hasChanges) {
      writeFileSync(filePath, content, 'utf-8');
      return { success: true, changes: changeCount };
    }

    return { success: true, changes: 0 };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🔍 既存のブログ記事から本名を削除します...\n');

  // postsディレクトリのパスを取得
  const postsDir = join(__dirname, '..', '..', 'posts');

  // HTMLファイルを取得
  const files = readdirSync(postsDir).filter(file => file.endsWith('.html'));

  console.log(`📂 ${files.length}個のHTMLファイルを処理します\n`);

  let totalChanges = 0;
  let filesModified = 0;
  const errors = [];

  // 各ファイルを処理
  for (const file of files) {
    const filePath = join(postsDir, file);
    const result = removeRealNamesFromFile(filePath);

    if (result.success) {
      if (result.changes > 0) {
        console.log(`✅ ${file}: ${result.changes}箇所を修正`);
        totalChanges += result.changes;
        filesModified++;
      }
    } else {
      console.log(`❌ ${file}: エラー - ${result.error}`);
      errors.push({ file, error: result.error });
    }
  }

  // 結果のサマリーを表示
  console.log('\n' + '='.repeat(60));
  console.log('📊 処理結果サマリー');
  console.log('='.repeat(60));
  console.log(`✅ 処理したファイル数: ${files.length}`);
  console.log(`📝 修正したファイル数: ${filesModified}`);
  console.log(`🔧 合計修正箇所: ${totalChanges}`);

  if (errors.length > 0) {
    console.log(`\n❌ エラーが発生したファイル: ${errors.length}個`);
    errors.forEach(err => {
      console.log(`  - ${err.file}: ${err.error}`);
    });
  }

  console.log('\n✨ 処理が完了しました！');
}

// 実行
main().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});