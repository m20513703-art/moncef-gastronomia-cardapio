const STORE_KEY = 'moncef_delivery_pdv_demo_v1';
const ORDER_HISTORY_KEY = 'moncef_customer_order_history_v1';
const readOrderHistory = () => { try { const value=JSON.parse(localStorage.getItem(ORDER_HISTORY_KEY)||'[]'); return Array.isArray(value)?value:[]; } catch { return []; } };
const saveOrderHistory = value => localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(value));
const STATUS = ['Novo', 'Em preparo', 'Pronto', 'Saiu para entrega', 'Concluído', 'Cancelado'];
const money = n => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n || 0));
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
const read = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { return null; } };
const save = () => localStorage.setItem(STORE_KEY, JSON.stringify(state));
let state = null;
let catalog = [];
let cart = [];
let saleCart = [];
let activeCategory = 'Pizzas';

async function boot() {
  const response = await fetch('catalog.json');
  catalog = await response.json();
  const existing = read();
  state = existing && Array.isArray(existing.products) ? existing : {
    products: catalog,
    orders: [],
    settings: { openTime: '18:00', closeTime: '23:00', deliveryFee: 0, isOpen: true }
  };
  if (!state.settings) state.settings = { openTime: '18:00', closeTime: '23:00', deliveryFee: 0, isOpen: true };
  else if (state.settings.openTime === '00:00' && state.settings.closeTime === '23:59') { state.settings.openTime = '18:00'; state.settings.closeTime = '23:00'; }
  if (!Array.isArray(state.orders)) state.orders = [];
  save();
  if (document.body.dataset.page === 'delivery') initDelivery();
  else initPdv();
  window.addEventListener('storage', e => { if (e.key === STORE_KEY) { state = read() || state; refreshPage(); } });
  window.addEventListener('focus', refreshPage);
}
function refreshPage() {
  state = read() || state;
  if (document.body.dataset.page === 'delivery') { renderProducts(); renderCart(); renderStoreNotice(); }
  else { renderOrders(); renderProductRows(); renderStoreNotice(); }
}
function productUnitPrice(product, label) {
  const v = (product.variants || []).find(x => x.label === label) || (product.variants || [])[0];
  return Number(v?.price || 0);
}
function priceVariants(product) {
  return (product.variants || []).map(v => `<option value="${esc(v.label)}">${esc(v.label)} · ${money(v.price)}</option>`).join('');
}
function initDelivery() {
  renderCategories(); renderProducts(); renderCart(); renderStoreNotice(); renderOrderHistory();
  document.getElementById('categoryTabs').addEventListener('click', e => {
    const button = e.target.closest('[data-category]'); if (!button) return;
    activeCategory = button.dataset.category;
    document.querySelectorAll('#categoryTabs button').forEach(b => b.classList.toggle('active', b === button));
    renderProducts();
  });
  document.getElementById('products').addEventListener('change', e => {
    if (e.target.matches('[data-variant]')) updateCardPrice(e.target.closest('.product-card'));
    if (e.target.matches('[data-flavor2]')) updateCardPrice(e.target.closest('.product-card'));
    if (e.target.matches('[data-topping]')) {
      const card=e.target.closest('.product-card');
      if(card.querySelectorAll('[data-topping]:checked').length>5){e.target.checked=false;alert('Escolha até cinco ingredientes.');}
    }
    if (e.target.matches('[data-extra-check]')) updateCardPrice(e.target.closest('.product-card'));
  });
  document.getElementById('products').addEventListener('click', e => {
    const button = e.target.closest('[data-add]'); if (!button) return;
    const card = button.closest('.product-card'); addProductToCart(card.dataset.id, card);
  });
  document.getElementById('cartItems').addEventListener('click', e => {
    const control = e.target.closest('[data-cart-action]'); if (!control) return;
    const i = Number(control.dataset.index); const action = control.dataset.cartAction;
    if (!cart[i]) return;
    if (action === 'plus') cart[i].qty++;
    if (action === 'minus') cart[i].qty--;
    if (action === 'remove' || cart[i].qty <= 0) cart.splice(i, 1);
    renderCart();
  });
  document.getElementById('checkoutButton').addEventListener('click', () => {
    if (!cart.length) return;
    if (!isOpenNow()) { renderStoreNotice(); return; }
    document.getElementById('orderConfirmation').classList.add('hide');
    document.getElementById('checkoutModal').showModal();
  });
  document.getElementById('checkoutForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!cart.length || !isOpenNow()) { alert('A loja está fechada ou o carrinho está vazio.'); return; }
    const data = new FormData(e.currentTarget);
    const id = `MON-${Date.now().toString().slice(-6)}`;
    const items = cart.map(x => ({ ...x }));
    const subtotalKnown = items.reduce((sum, line) => sum + (line.pricePending ? 0 : line.unitPrice * line.qty), 0);
    const messageLines = [
      'Olá! Quero fazer um pedido pelo cardápio online da Moncef Gastronomia.',
      `Pedido: ${id}`,
      `Nome: ${data.get('customerName')}`,
      `WhatsApp/telefone: ${data.get('customerPhone')}`,
      `Endereço de entrega: ${data.get('customerAddress')}`,
      `Pagamento desejado: ${data.get('paymentMethod')}`,
      data.get('changeFor') ? `Troco para: ${data.get('changeFor')}` : '',
      'Itens:',
      ...items.map(line => `${line.qty}× ${line.name} (${line.variant})${line.description ? ` — ${line.description}` : ''} — ${line.pricePending ? 'preço a confirmar' : money(line.unitPrice * line.qty)}`),
      `Subtotal de itens com preço definido: ${money(subtotalKnown)}`,
      'Taxa de entrega e total final: confirmar com a equipe.',
      data.get('orderNotes') ? `Observações: ${data.get('orderNotes')}` : ''
    ].filter(Boolean);
    const historyItem = { id, createdAt: new Date().toISOString(), items, subtotalKnown, payment: String(data.get('paymentMethod') || '') };
    saveOrderHistory([historyItem, ...readOrderHistory()].slice(0, 50));
    cart = []; renderCart(); renderOrderHistory(); e.currentTarget.reset();
    document.getElementById('checkoutModal').close();
    window.location.href = `https://wa.me/553591543236?text=${encodeURIComponent(messageLines.join('\n'))}`;
  });
  document.getElementById('orderHistoryList').addEventListener('click', e => {
    const button = e.target.closest('[data-repeat-order]'); if (!button) return;
    const saved = readOrderHistory().find(x => x.id === button.dataset.repeatOrder); if (!saved) return;
    cart = saved.items.map(x => ({ ...x })); renderCart(); document.getElementById('checkoutButton').scrollIntoView({behavior:'smooth',block:'center'});
  });
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => document.getElementById(b.dataset.close).close()));
}
function renderCategories() {
  const cats = ['Todos', ...new Set(state.products.filter(p => p.enabled !== false).map(p => p.category))];
  const info = { 'Todos':['🍽️','Explore o cardápio'], 'Pizzas':['🍕','Sabores e tamanhos'], 'Complementos':['🧀','Bordas recheadas'], 'Esfihas':['🥟','Tradicionais, gourmet e doces'], 'Porções':['🍟','Para compartilhar'], 'Açaí':['🍧','Açaí, cupuaçu e vitaminas'], 'Adicionais':['🍫','Complementos para açaí'], 'Bebidas':['🥤','Sucos e bebidas'] };
  const root = document.getElementById('categoryTabs');
  root.innerHTML = cats.map(c => { const data=info[c]||['🍴','Veja opções e preços']; return `<button type="button" data-category="${esc(c)}" class="${c===activeCategory?'active':''}"><span class="shortcut-icon">${data[0]}</span><strong>${esc(c)}</strong><small>${esc(data[1])}</small></button>`; }).join('');
}
function renderProducts() {
  if (!document.getElementById('products')) return;
  renderCategories();
  const products = state.products.filter(p => p.enabled !== false && (activeCategory === 'Todos' || p.category === activeCategory));
  const addOns = state.products.filter(p => p.category === 'Adicionais' && p.enabled !== false);
  const root = document.getElementById('products');
  root.innerHTML = products.map(p => {
    const v = p.variants?.[0] || { label:'unidade', price:0 };
    const pizzaOptions = p.kind === 'pizza' ? `<details class="customization"><summary>Combinar dois sabores (opcional)</summary><label>Segundo sabor · o valor final será confirmado pelo atendimento</label><select data-flavor2><option value="">Sem segundo sabor</option>${state.products.filter(x => x.kind === 'pizza' && x.enabled !== false && x.id !== p.id).map(x => `<option value="${esc(x.id)}">${esc(x.name)} · ${money(productUnitPrice(x, v.label))}</option>`).join('')}</select></details>` : '';
    const calzoneOptions = p.kind === 'calzone' ? `<details class="customization"><summary>Escolher sabor</summary><label>Sabor do calzone</label><select data-calzone-flavor><option value="">Escolha um sabor</option>${state.products.filter(x => x.kind === 'pizza' && x.enabled !== false).map(x => `<option>${esc(x.name)}</option>`).join('')}</select></details>` : '';
    const crustOptions = p.kind === 'crust' ? `<details class="customization"><summary>Escolher sabor da borda</summary><select data-crust-flavor><option>Catupiry</option><option>Cheddar</option><option>Chocolate</option><option>Cream cheese</option></select></details>` : '';
    const toppingList = ['Calabresa','Cebola','Frango desfiado','Milho','Bacon','Champignon','Palmito','Tomate','Presunto','Requeijão','Cheddar','Azeitona','Ovo','Brócolis','Costela','Carne seca'];
    const customPizza = p.kind === 'custom-pizza' ? `<details class="customization"><summary>Escolher até 5 ingredientes</summary><div class="extras-list">${toppingList.map(x => `<div class="extra-option"><label><input data-topping="${esc(x)}" type="checkbox"> ${esc(x)}</label></div>`).join('')}</div></details>` : '';
    const extras = p.kind === 'acai' ? `<details><summary>Adicionar complementos</summary><div class="extras-list">${addOns.map(x => `<div class="extra-option"><label><input data-extra-check="${esc(x.id)}" type="checkbox"> ${esc(x.name)}</label><strong>${money(x.variants?.[0]?.price)}</strong></div>`).join('')}</div></details>` : '';
    return `<article class="product-card" data-id="${esc(p.id)}" data-kind="${esc(p.kind||'item')}">${p.image?`<img class="product-thumb" src="${esc(p.image)}" alt="Foto ilustrativa de ${esc(p.name)}" loading="lazy">`:''}<div class="product-group">${esc(p.category)} · ${esc(p.group||'')}</div><h3>${esc(p.name)}</h3>${p.description?`<p class="product-desc">${esc(p.description)}</p>`:''}<label>Opção / tamanho</label><select data-variant>${priceVariants(p)}</select>${pizzaOptions}${calzoneOptions}${crustOptions}${customPizza}${extras}<div class="product-bottom"><span class="price" data-card-price>${money(v.price)}</span><button class="btn" data-add type="button">Adicionar</button></div></article>`;
  }).join('') || '<p class="muted">Não há itens disponíveis nesta categoria.</p>';
}
function updateCardPrice(card) {
  if (!card) return;
  const p = state.products.find(x => x.id === card.dataset.id); if (!p) return;
  const label = card.querySelector('[data-variant]')?.value;
  let value = productUnitPrice(p, label);
  const secondId = card.querySelector('[data-flavor2]')?.value;
  if (secondId) { card.querySelector('[data-card-price]').textContent = 'A confirmar'; return; }
  card.querySelectorAll('[data-extra-check]:checked').forEach(check => { const extra=state.products.find(x=>x.id===check.dataset.extraCheck); if(extra) value += productUnitPrice(extra, extra.variants?.[0]?.label); });
  card.querySelector('[data-card-price]').textContent = money(value);
}
function addProductToCart(id, card) {
  const p = state.products.find(x => x.id === id); if (!p || p.enabled === false) return;
  const variant = card.querySelector('[data-variant]')?.value || p.variants?.[0]?.label || 'unidade';
  let unitPrice = productUnitPrice(p, variant); let name = p.name; let description = p.description || ''; let pricePending = false;
  const flavor2 = card.querySelector('[data-flavor2]')?.value;
  if (flavor2) {
    const p2 = state.products.find(x => x.id === flavor2); if (p2) { pricePending = true; unitPrice = 0; name += ` meio a meio: ${p2.name}`; description += ' · Valor final da combinação a confirmar pelo WhatsApp.'; }
  }
  const calzoneFlavor=card.querySelector('[data-calzone-flavor]')?.value;
  if(p.kind==='calzone') { if(!calzoneFlavor){alert('Escolha o sabor do calzone.');return;} description+=` · Sabor: ${calzoneFlavor}`; }
  const crustFlavor=card.querySelector('[data-crust-flavor]')?.value;
  if(p.kind==='crust'&&crustFlavor) description+=` · Borda: ${crustFlavor}`;
  const toppings=[...card.querySelectorAll('[data-topping]:checked')].map(x=>x.dataset.topping);
  if(p.kind==='custom-pizza') { if(toppings.length>5){alert('Escolha até cinco ingredientes.');return;} description+=` · Ingredientes: ${toppings.join(', ')||'a escolher'}`; }
  const selectedExtras = [...card.querySelectorAll('[data-extra-check]:checked')].map(check => state.products.find(x => x.id === check.dataset.extraCheck)).filter(Boolean);
  if (selectedExtras.length) { unitPrice += selectedExtras.reduce((sum,x)=>sum+productUnitPrice(x,x.variants?.[0]?.label),0); description += ` · Adicionais: ${selectedExtras.map(x=>x.name).join(', ')}`; }
  const key = `${p.id}-${variant}-${flavor2||calzoneFlavor||''}-${crustFlavor||''}-${toppings.join(',')}-${selectedExtras.map(x=>x.id).join(',')}`;
  const found = cart.find(x => x.key === key);
  if (found) found.qty++;
  else cart.push({ key, productId:p.id, name, variant, description, unitPrice, pricePending, qty:1 });
  renderCart();
}
function renderCart() {
  const root = document.getElementById('cartItems'); if (!root) return;
  const count = cart.reduce((n,x)=>n+x.qty,0); document.getElementById('cartCount').textContent = count;
  if (!cart.length) root.innerHTML = '<div class="cart-empty">Seu carrinho está vazio.</div>';
  else root.innerHTML = cart.map((x,i)=>`<div class="cart-line"><div class="cart-line-head"><span>${esc(x.qty)}× ${esc(x.name)}</span><strong>${x.pricePending?'Preço a confirmar':money(x.unitPrice*x.qty)}</strong></div><small>${esc(x.variant)}${x.description?` · ${esc(x.description)}`:''}</small><div class="cart-line-controls"><button type="button" data-cart-action="minus" data-index="${i}" aria-label="Diminuir">−</button><span>${x.qty}</span><button type="button" data-cart-action="plus" data-index="${i}" aria-label="Aumentar">+</button><button type="button" data-cart-action="remove" data-index="${i}">Remover</button></div></div>`).join('');
  const subtotal = cart.reduce((n,x)=>n+(x.pricePending?0:x.unitPrice*x.qty),0);
  document.getElementById('cartSubtotal').textContent=money(subtotal);document.getElementById('deliveryFee').textContent='A confirmar';document.getElementById('cartTotal').textContent='A confirmar no WhatsApp';
  const button=document.getElementById('checkoutButton');button.disabled=!cart.length||!isOpenNow();button.title=!isOpenNow()?'A loja está fechada; pedidos disponíveis todos os dias, das 18h às 23h.':'';
}
function renderOrderHistory() {
  const root=document.getElementById('orderHistoryList'); if(!root) return;
  const orders=readOrderHistory();
  if(!orders.length){root.innerHTML='<div class="panel muted">Seus pedidos preparados neste aparelho vão aparecer aqui.</div>';return;}
  root.innerHTML=orders.map(order=>`<article class="order-card"><div class="product-group">Pedido ${esc(order.id)}</div><h3>Solicitação <span class="status-chip">Preparada para WhatsApp</span></h3><div class="order-meta">${new Date(order.createdAt).toLocaleString('pt-BR')} · salvo neste aparelho</div><div class="order-items">${(order.items||[]).map(line=>`<div>${esc(line.qty)}× ${esc(line.name)} (${esc(line.variant)}) — ${line.pricePending?'preço a confirmar':money(line.unitPrice*line.qty)}</div>${line.description?`<small class="muted">${esc(line.description)}</small>`:''}`).join('')}<div class="total-row"><span>Subtotal com preço definido</span><strong>${money(order.subtotalKnown||0)}</strong></div><small class="muted">A taxa e o valor final são confirmados pela Moncef. Este registro não confirma que a mensagem foi enviada.</small></div><button class="btn secondary" type="button" data-repeat-order="${esc(order.id)}">Repetir pedido</button></article>`).join('');
}
function isOpenNow() {
  const s=state.settings||{}; if(s.isOpen===false) return false; const open=s.openTime||'18:00', close=s.closeTime||'23:00';
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
  const mins=Number(parts.find(x=>x.type==='hour')?.value||0)*60+Number(parts.find(x=>x.type==='minute')?.value||0);
  const a=Number(open.slice(0,2))*60+Number(open.slice(3,5)); const b=Number(close.slice(0,2))*60+Number(close.slice(3,5));
  return a<=b ? mins>=a&&mins<b : mins>=a||mins<b;
}
function renderStoreNotice() {
  const s=state.settings||{}; const open=isOpenNow();
  const msg=`${open?'🟢 Aberto agora':'🔴 Fechado'} · Todos os dias, ${esc(s.openTime||'18:00')}–${esc(s.closeTime||'23:00')} · Taxa de entrega a confirmar no WhatsApp.`;
  const el=document.getElementById('storeNotice');if(el){el.textContent=msg;el.classList.toggle('closed',!open);}
  const pdv=document.getElementById('pdvStoreNotice');if(pdv){pdv.textContent=msg;pdv.classList.toggle('closed',!open);}
}
function initPdv() {
  renderOrders(); renderProductRows(); renderStoreNotice(); setupTabs(); setupSale(); setupProducts(); setupSettings();
  document.getElementById('clearDemoOrders').addEventListener('click',()=>{if(confirm('Apagar os pedidos desta demonstração deste navegador?')){state.orders=[];save();renderOrders();}});
}
function setupTabs() {
  document.querySelector('.pdv-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b)return;document.querySelectorAll('.pdv-tabs button').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.pdv-view').forEach(x=>x.hidden=x.id!==`view-${b.dataset.tab}`);if(b.dataset.tab==='sale')fillSaleProducts();});
}
function renderOrders() {
  const root=document.getElementById('ordersList');if(!root)return;
  root.innerHTML=state.orders.length?state.orders.map(o=>`<article class="order-card"><div class="product-group">${esc(o.channel)} · ${esc(o.id)}</div><h3>${esc(o.customer?.name||'Venda balcão')} <span class="status-chip ${o.status==='Concluído'?'green':o.status==='Cancelado'?'red':''}">${esc(o.status)}</span></h3><div class="order-meta">${new Date(o.createdAt).toLocaleString('pt-BR')} · ${esc(o.payment||'Pagamento não informado')}</div>${o.customer?.phone?`<div>Telefone: ${esc(o.customer.phone)}</div>`:''}${o.customer?.address?`<div>Endereço: ${esc(o.customer.address)}</div>`:''}${o.customer?.notes?`<div class="muted">Obs.: ${esc(o.customer.notes)}</div>`:''}<div class="order-items">${(o.items||[]).map(x=>`<div>${esc(x.qty)}× ${esc(x.name)} (${esc(x.variant)}) — ${money(x.unitPrice*x.qty)}</div>${x.description?`<small class="muted">${esc(x.description)}</small>`:''}`).join('')}<div class="totals"><div class="total-row"><span>Subtotal</span><strong>${money(o.subtotal)}</strong></div><div class="total-row"><span>Entrega</span><strong>${money(o.deliveryFee)}</strong></div><div class="total-row total"><span>Total</span><strong>${money(o.total)}</strong></div></div></div><div class="order-actions"><label class="small-note">Status <select data-order-status="${esc(o.id)}">${STATUS.map(st=>`<option ${o.status===st?'selected':''}>${esc(st)}</option>`).join('')}</select></label></div></article>`).join(''):'<div class="panel muted">Nenhum registro neste PDV. Solicitações do cardápio são enviadas pelo WhatsApp e não aparecem automaticamente nesta fila.</div>';
  root.querySelectorAll('[data-order-status]').forEach(sel=>sel.addEventListener('change',()=>{const order=state.orders.find(x=>x.id===sel.dataset.orderStatus);if(order){order.status=sel.value;save();renderOrders();}}));
}
function fillSaleProducts() {
  const select=document.getElementById('saleProduct');if(!select)return;
  const avail=state.products.filter(p=>p.enabled!==false);
  select.innerHTML=avail.map(p=>`<option value="${esc(p.id)}">${esc(p.category)} · ${esc(p.name)}</option>`).join('');
  fillSaleVariants();
}
function fillSaleVariants() {
  const p=state.products.find(x=>x.id===document.getElementById('saleProduct')?.value);
  const select=document.getElementById('saleVariant');if(!select)return;
  select.innerHTML=(p?.variants||[]).map(v=>`<option value="${esc(v.label)}">${esc(v.label)} · ${money(v.price)}</option>`).join('');
}
function setupSale() {
  document.getElementById('saleProduct').addEventListener('change',fillSaleVariants);
  document.getElementById('addSaleItem').addEventListener('click',()=>{
    const p=state.products.find(x=>x.id===document.getElementById('saleProduct').value);if(!p)return;
    const variant=document.getElementById('saleVariant').value;const qty=Math.max(1,Number(document.getElementById('saleQuantity').value||1));
    const line=saleCart.find(x=>x.productId===p.id&&x.variant===variant);if(line)line.qty+=qty;else saleCart.push({productId:p.id,name:p.name,description:p.description||'',variant,unitPrice:productUnitPrice(p,variant),qty});
    renderSaleCart();
  });
  document.getElementById('finishSale').addEventListener('click',()=>{
    if(!saleCart.length){alert('Adicione pelo menos um produto.');return;}
    const subtotal=saleCart.reduce((a,x)=>a+x.qty*x.unitPrice,0);
    const o={id:`BAL-${Date.now().toString().slice(-6)}`,channel:'Balcão',status:'Concluído',createdAt:new Date().toISOString(),customer:{name:document.getElementById('saleCustomer').value||'Venda balcão'},payment:'Não informado',items:saleCart.map(x=>({...x})),subtotal,deliveryFee:0,total:subtotal,demo:true};
    state.orders.unshift(o);save();saleCart=[];renderSaleCart();renderOrders();document.getElementById('saleCustomer').value='';alert(`Venda demo ${o.id} registrada.`);
  });
}
function renderSaleCart() {
  const root=document.getElementById('saleCart');if(!root)return;
  root.innerHTML=saleCart.length?saleCart.map((x,i)=>`<div class="cart-line"><div class="cart-line-head"><span>${x.qty}× ${esc(x.name)}</span><strong>${money(x.qty*x.unitPrice)}</strong></div><small>${esc(x.variant)}</small><button type="button" class="btn ghost" data-sale-remove="${i}">Remover</button></div>`).join(''):'<div class="cart-empty">Nenhum item adicionado.</div>';
  root.querySelectorAll('[data-sale-remove]').forEach(b=>b.addEventListener('click',()=>{saleCart.splice(Number(b.dataset.saleRemove),1);renderSaleCart();}));
  document.getElementById('saleTotal').textContent=money(saleCart.reduce((a,x)=>a+x.qty*x.unitPrice,0));
}
function setupProducts() {
  const form=document.getElementById('productForm');
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const id=document.getElementById('editProductId').value;
    const raw=document.getElementById('productVariants').value;
    const variants=raw.split(';').map(part=>{const [label,price]=part.split(':');return {label:(label||'').trim(),price:Number((price||'').trim().replace(',','.'))};}).filter(x=>x.label&&Number.isFinite(x.price)&&x.price>=0);
    if(!variants.length){alert('Informe pelo menos uma opção no formato “unidade:12”.');return;}
    const current=id?state.products.find(x=>x.id===id):null;
    const product={...(current||{}),id:id||`custom-${Date.now()}`,category:document.getElementById('productCategory').value.trim(),group:document.getElementById('productGroup').value.trim(),name:document.getElementById('productName').value.trim(),description:document.getElementById('productDescription').value.trim(),image:document.getElementById('productImage').value.trim(),variants,enabled:current?.enabled!==false,kind:current?.kind||'item'};
    if(id)state.products=state.products.map(x=>x.id===id?product:x);else state.products.push(product);
    save();form.reset();document.getElementById('editProductId').value='';document.getElementById('saveProduct').textContent='Salvar produto';renderProductRows();
  });
  document.getElementById('cancelEdit').addEventListener('click',()=>{form.reset();document.getElementById('editProductId').value='';document.getElementById('saveProduct').textContent='Salvar produto';});
  document.getElementById('productRows').addEventListener('click',e=>{
    const b=e.target.closest('[data-product-action]');if(!b)return;
    const p=state.products.find(x=>x.id===b.dataset.id);if(!p)return;
    if(b.dataset.productAction==='toggle'){p.enabled=p.enabled===false;save();renderProductRows();}
    if(b.dataset.productAction==='edit'){
      document.getElementById('editProductId').value=p.id;document.getElementById('productName').value=p.name;document.getElementById('productCategory').value=p.category;document.getElementById('productGroup').value=p.group||'';document.getElementById('productImage').value=p.image||'';document.getElementById('productDescription').value=p.description||'';document.getElementById('productVariants').value=(p.variants||[]).map(v=>`${v.label}:${v.price}`).join('; ');document.getElementById('saveProduct').textContent='Atualizar produto';document.querySelector('[data-tab="products"]').click();window.scrollTo({top:0,behavior:'smooth'});
    }
    if(b.dataset.productAction==='delete'&&confirm(`Remover “${p.name}” do cardápio desta demonstração?`)){state.products=state.products.filter(x=>x.id!==p.id);save();renderProductRows();}
  });
}
function renderProductRows() {
  const root=document.getElementById('productRows');if(!root)return;
  root.innerHTML=state.products.map(p=>`<tr><td><strong>${esc(p.name)}</strong><br><small class="muted">${esc(p.group||'')}</small></td><td>${esc(p.category)}</td><td>${money(p.variants?.[0]?.price)}</td><td>${p.enabled===false?'Indisponível':'Disponível'}</td><td><button class="btn ghost" data-product-action="edit" data-id="${esc(p.id)}">Editar</button> <button class="btn ghost" data-product-action="toggle" data-id="${esc(p.id)}">${p.enabled===false?'Ativar':'Pausar'}</button> <button class="btn danger" data-product-action="delete" data-id="${esc(p.id)}">Excluir</button></td></tr>`).join('');
}
function setupSettings() {
  const s=state.settings||{};
  document.getElementById('openTime').value=s.openTime||'18:00';document.getElementById('closeTime').value=s.closeTime||'23:00';document.getElementById('deliveryFeeInput').value=Number(s.deliveryFee||0);document.getElementById('storeOpenToggle').value=String(s.isOpen!==false);
  document.getElementById('settingsForm').addEventListener('submit',e=>{e.preventDefault();state.settings={openTime:document.getElementById('openTime').value||'18:00',closeTime:document.getElementById('closeTime').value||'23:00',deliveryFee:Number(document.getElementById('deliveryFeeInput').value||0),isOpen:document.getElementById('storeOpenToggle').value==='true'};save();renderStoreNotice();alert('Configuração salva apenas neste navegador.');});
}
boot().catch(error=>{console.error(error);document.body.insertAdjacentHTML('afterbegin','<div class="demo-banner">Falha ao carregar o cardápio. Abra a página pelo GitHub Pages, não como arquivo local.</div>');});
