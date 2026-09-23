const fs = require('fs');
const path = 'cms.html';
const text = fs.readFileSync(path, 'utf8');
const start = text.indexOf('    const fileFields=`');
const end = text.indexOf('    function openReview', start);
if (start === -1 || end === -1) {
  throw new Error('CMS repair markers not found');
}

const replacement = String.raw`
    const fileFields=\`<div class="field full"><label>Product images <span>*</span> (4 required)</label><input name="images" type="file" accept="image/*" multiple \${''}><small style="color:var(--muted)">Select exactly four images, or use image paths below.</small></div><div class="field full"><label>Image paths</label><input name="imagePaths" placeholder="image-1.jpg, image-2.jpg, image-3.jpg, image-4.jpg"></div>\`;
    const bindVariationRemove = () => {
      $$('#variationRows .remove-variation').forEach((button) => {
        button.onclick = () => {
          const rows = $$('#variationRows .variation-editor-row');
          if (rows.length > 1) button.parentElement.remove();
        };
      });
    };
    function openProduct(index = null) {
      const p = index === null ? { name: '', category: 'Cosmetics', description: '', variations: [{ name: '', price: '', images: [] }], price: '', images: [] } : data.products[index];
      const variations = (p.variations?.length ? p.variations : [{ name: p.variation || 'Default', price: p.price, images: [] }]).map((v) => typeof v === 'string' ? { name: v, price: p.price, images: [] } : v);
      const variationMarkup = variations.map((v, variationIndex) => `
        <div class="variation-editor-row" style="display:grid;grid-template-columns:1fr 150px 1fr auto;gap:8px;margin-bottom:12px">
          <input name="variationNames" required value="\${esc(v.name)}" placeholder="e.g. Black">
          <input name="variationPrices" type="number" min="0" required value="\${esc(v.price)}" placeholder="Price">
          <div class="variation-image-stack" style="display:flex;flex-direction:column;gap:6px;min-width:0">
            <input type="file" class="variation-image-upload" accept="image/*" multiple data-index="\${variationIndex}" style="width:100%">
            <input type="text" name="variationImagePaths" value="\${esc((v.images || []).join(', '))}" placeholder="variation image paths or urls" style="width:100%">
            <div class="variation-image-preview" style="display:flex;flex-wrap:wrap;gap:6px;min-height:42px">\${(v.images || []).map((src) => \`<img src="\${esc(src)}" alt="" style="width:42px;height:42px;object-fit:cover;border-radius:8px;border:1px solid #ddd;display:block">\`).join('')}</div>
          </div>
          <button type="button" class="btn danger remove-variation" title="Remove variation">×</button>
        </div>
      `).join('');
      openModal(index === null ? 'Add product' : 'Edit product', \`
        <div class="form-grid">
          <div class="field"><label>Product name <span>*</span></label><input name="name" required value="\${esc(p.name)}"></div>
          <div class="field"><label>Category / page <span>*</span></label><select name="category" required>\${categories.slice(1).map((c) => \`<option \${c === p.category ? 'selected' : ''}>\${c}</option>\`).join('')}</select></div>
          <div class="field full"><label>One-line description <span>*</span></label><input name="description" required value="\${esc(p.description)}"></div>
          <div class="field full"><label>Product variations <span>*</span></label>
            <div id="variationRows">\${variationMarkup}</div>
            <button type="button" class="btn" id="addVariation">+ Add another variation</button>
          </div>
          \${fileFields}
          <div class="field full"><label>Full product description <span>*</span></label><textarea name="fullDescription" required>\${esc(p.fullDescription || p.description)}</textarea></div>
        </div>
        <div class="form-actions"><button class="btn primary">Save product</button></div>
      \`, async (form) => {
        const files = form.getAll('images').filter((file) => file instanceof File && file.size > 0);
        const paths = String(form.get('imagePaths') || '').split(',').map((x) => x.trim()).filter(Boolean);
        const images = files.length === 4 ? await Promise.all(files.map(fileToDataUrl)) : paths.length === 4 ? paths : (p.images || []);
        const names = form.getAll('variationNames').map((x) => x.trim()).filter(Boolean);
        const prices = form.getAll('variationPrices').map(Number);
        const variationPathInputs = form.querySelectorAll('input[name="variationImagePaths"]');
        const variationUploadInputs = form.querySelectorAll('.variation-image-upload');
        const variationItems = await Promise.all(names.map(async (name, index) => {
          const variationFiles = variationUploadInputs[index]?.files ? Array.from(variationUploadInputs[index].files) : [];
          const variationPaths = String(variationPathInputs[index]?.value || '').split(',').map((x) => x.trim()).filter(Boolean);
          const uploadedImages = variationFiles.length ? await Promise.all(variationFiles.map(fileToDataUrl)) : [];
          return { name, price: Number(prices[index]) || 0, images: [...new Set([...variationPaths, ...uploadedImages])] };
        }));
        if (images.length !== 4) {
          alert('Please upload exactly 4 images or enter exactly 4 image paths.');
          return false;
        }
        if (!names.length || !prices.every((price) => Number.isFinite(price) && price >= 0) || names.length !== prices.length) {
          alert('Please add at least one complete variation.');
          return false;
        }
        const variations = variationItems.filter((item) => item.name && Number.isFinite(item.price) && item.price >= 0);
        const record = {
          id: p.id || 'rak-' + Date.now(),
          name: form.get('name'),
          category: form.get('category'),
          description: form.get('description'),
          fullDescription: form.get('fullDescription'),
          variations,
          price: variations[0]?.price || 0,
          images
        };
        if (index === null) data.products.push(record); else data.products[index] = record;
        return true;
      });
      const rows = $('#variationRows');
      $('#addVariation').onclick = () => {
        const row = document.createElement('div');
        row.className = 'variation-editor-row';
        row.style.cssText = 'display:grid;grid-template-columns:1fr 150px 1fr auto;gap:8px;margin-bottom:12px';
        row.innerHTML = '<input name="variationNames" required placeholder="e.g. White"><input name="variationPrices" type="number" min="0" required placeholder="Price"><div class="variation-image-stack" style="display:flex;flex-direction:column;gap:6px;min-width:0"><input type="file" class="variation-image-upload" accept="image/*" multiple style="width:100%"><input type="text" name="variationImagePaths" placeholder="variation image paths or urls" style="width:100%"><div class="variation-image-preview" style="display:flex;flex-wrap:wrap;gap:6px;min-height:42px"></div></div><button type="button" class="btn danger remove-variation" title="Remove variation">×</button>';
        rows.appendChild(row);
        const upload = row.querySelector('.variation-image-upload');
        const pathInput = row.querySelector('input[name="variationImagePaths"]');
        const preview = row.querySelector('.variation-image-preview');
        upload.onchange = async () => {
          const files = [...(upload.files || [])];
          if (!files.length) return;
          const current = String(pathInput.value || '').split(',').map((x) => x.trim()).filter(Boolean);
          const urls = await Promise.all(files.map(fileToDataUrl));
          const merged = [...new Set([...current, ...urls])];
          pathInput.value = merged.join(', ');
          preview.innerHTML = merged.map((src) => \`<img src="\${src}" alt="" style="width:42px;height:42px;object-fit:cover;border-radius:8px;border:1px solid #ddd;display:block">\`).join('');
        };
        bindVariationRemove();
      };
      bindVariationRemove();
    }
`;

const newText = text.substring(0, start) + replacement + text.substring(end);
fs.writeFileSync(path, newText, 'utf8');
console.log('CMS block repaired');
