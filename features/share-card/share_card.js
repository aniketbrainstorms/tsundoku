// ══════════════════════════════════════════════════════════════
// SHARE CARD — ticket-style shareable book image
// ══════════════════════════════════════════════════════════════

function dsBuildShareCardNode(book) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'width:280px;background:#1a1814;color:#ece7dc;border:2px dashed #4a453d;border-radius:6px;padding:24px 20px;font-family:monospace;position:fixed;left:-9999px;top:0;';
  const coverUrl = book.cover_url || '';
  wrap.innerHTML = `
    <div style="text-align:center;font-size:12px;letter-spacing:2px;color:#8a8478;margin-bottom:18px">tsundoku</div>
    <div id="dsShareCoverBox" style="border:1px dashed #4a453d;border-radius:4px;aspect-ratio:2/3;display:flex;align-items:center;justify-content:center;margin-bottom:18px;overflow:hidden">
      ${coverUrl ? `<img id="dsShareCoverImg" crossorigin="anonymous" src="${escapeAttr(coverUrl)}" style="width:100%;height:100%;object-fit:cover" />` : `<span style="font-size:11px;color:#6b665c;letter-spacing:1px">book cover</span>`}
    </div>
    <div style="text-align:center;margin-bottom:16px">
      <div style="font-size:14px;font-weight:500;margin-bottom:4px">${escapeHtml((book.title || '').toLowerCase())}</div>
      <div style="font-size:12px;color:#8a8478">${escapeHtml((book.author || '').toLowerCase())}</div>
    </div>
    <div style="font-size:11px;line-height:1.7;color:#b8b2a4;margin-bottom:20px;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden">${escapeHtml(book.description || book.ai_summary || '')}</div>
    <div style="text-align:center;font-size:12px;letter-spacing:2px;color:#8a8478">tsundoku</div>
  `;
  document.body.appendChild(wrap);
  return wrap;
}

async function dsGenerateShareBlob(book) {
  const node = dsBuildShareCardNode(book);
  const img = node.querySelector('#dsShareCoverImg');
  if (img) {
    const loaded = await new Promise(res => {
      img.onload = () => res(true);
      img.onerror = () => res(false);
      if (img.complete) res(true);
    });
    if (!loaded) {
      const box = node.querySelector('#dsShareCoverBox');
      if (box) box.innerHTML = '<span style="font-size:11px;color:#6b665c;letter-spacing:1px">book cover</span>';
    }
  }
  let blob;
  try {
    blob = await htmlToImage.toBlob(node, { pixelRatio: 3, backgroundColor: '#1a1814' });
  } finally {
    document.body.removeChild(node);
  }
  return blob;
}

async function dsShareImage() {
  const book = books.find(b => b.id === editingId);
  if (!book) return;
  try {
    const blob = await dsGenerateShareBlob(book);
    const file = new File([blob], `${book.title}.png`, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: book.title });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${book.title}.png`; a.click();
      URL.revokeObjectURL(url);
    }
  } catch (e) {
    if (e.name !== 'AbortError') { console.error('dsShareImage error:', e); showToast('Could not share image'); }
  }
}

async function dsCopyImage() {
  const book = books.find(b => b.id === editingId);
  if (!book) return;
  try {
    const blob = await dsGenerateShareBlob(book);
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showToast('Copied image ✓');
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${book.title}.png`; a.click();
      URL.revokeObjectURL(url);
    }
  } catch (e) {
    console.error('dsCopyImage error:', e);
    showToast('Could not copy image');
  }
}
