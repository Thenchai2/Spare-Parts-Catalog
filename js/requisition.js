        // ===== POS Searchable Dropdowns =====
        function openPOSCustomSelect(type) {
            const dropdown = document.getElementById('dropdown_pos' + (type === 'category' ? 'CategoryFilter' : 'MachineFilter'));
            dropdown.classList.remove('hidden');
            renderPOSCustomSelect(type, true);
            setTimeout(() => { document.getElementById('input_pos' + (type === 'category' ? 'CategoryFilter' : 'MachineFilter')).select(); }, 10);
        }

        function filterPOSCustomSelect(type) {
            const dropdown = document.getElementById('dropdown_pos' + (type === 'category' ? 'CategoryFilter' : 'MachineFilter'));
            dropdown.classList.remove('hidden');
            renderPOSCustomSelect(type, false);
        }

        function renderPOSCustomSelect(type, forceShowAll = false) {
            const isCat = type === 'category';
            const inputId = isCat ? 'input_posCategoryFilter' : 'input_posMachineFilter';
            const dropdownId = isCat ? 'dropdown_posCategoryFilter' : 'dropdown_posMachineFilter';
            
            const keywordString = forceShowAll ? '' : document.getElementById(inputId).value.toLowerCase();
            const keywords = keywordString.split(/\s+/).filter(k => k.length > 0);
            const dropdown = document.getElementById(dropdownId);
            dropdown.innerHTML = '';
            
            let allOptionHtml = `
                <div class="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 transition text-gray-800 font-medium bg-gray-50" 
                     onclick="selectPOSCustomOption('${type}', 'all', '')">
                    -- ${isCat ? 'ทุกประเภทอะไหล่' : 'ทุกเครื่องจักร'} --
                </div>`;
            dropdown.insertAdjacentHTML('beforeend', allOptionHtml);

            let matchCount = 0;
            if (isCat) {
                const categories = [...new Set(db.products.map(p => p.category))].filter(c => c && c.trim() !== '');
                categories.sort();
                categories.forEach(c => {
                    const textToSearch = c.toLowerCase();
                    if (keywords.length === 0 || keywords.every(kw => textToSearch.includes(kw))) {
                        dropdown.insertAdjacentHTML('beforeend', `<div class="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 transition text-gray-700" onclick="selectPOSCustomOption('category', '${escapeForJS(c)}', '${escapeForJS(c)}')">${escapeHTML(c)}</div>`);
                        matchCount++;
                    }
                });
            } else {
                const displayLimit = 50;
                const machines = [...db.machines];
                machines.sort((a, b) => String(a.name).localeCompare(String(b.name)));
                machines.forEach(m => {
                    const textToSearch = `${m.id} ${m.name}`.toLowerCase();
                    if (keywords.length === 0 || keywords.every(kw => textToSearch.includes(kw))) {
                        if (matchCount < displayLimit) {
                            dropdown.insertAdjacentHTML('beforeend', `<div class="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 transition text-gray-700" onclick="selectPOSCustomOption('machine', '${escapeForJS(m.id)}', '${escapeForJS(m.name)}')">${escapeHTML(m.name)}</div>`);
                        }
                        matchCount++;
                    }
                });
                if (matchCount > displayLimit) {
                    dropdown.insertAdjacentHTML('beforeend', `<div class="px-4 py-2 text-center bg-amber-50 text-xs text-amber-600 font-medium border-t border-amber-100"><i class="fa-solid fa-info-circle mr-1"></i>พบอีก ${matchCount - displayLimit} รายการ — พิมพ์เพิ่มเพื่อค้นหา</div>`);
                }
            }
            if (matchCount === 0 && keywords.length > 0) dropdown.insertAdjacentHTML('beforeend', `<div class="px-4 py-3 text-gray-400 text-sm text-center">ไม่พบข้อมูลที่ค้นหา</div>`);
        }

        function selectPOSCustomOption(type, value, displayName) {
            const isCat = type === 'category';
            const hiddenId = isCat ? 'posCategoryFilter' : 'posMachineFilter';
            const inputId = isCat ? 'input_posCategoryFilter' : 'input_posMachineFilter';
            const dropdownId = isCat ? 'dropdown_posCategoryFilter' : 'dropdown_posMachineFilter';
            
            document.getElementById(hiddenId).value = value;
            document.getElementById(inputId).value = value === 'all' ? '' : displayName;
            document.getElementById(dropdownId).classList.add('hidden');
            
            renderPOSGrid();
        }

        // ===== POS (Point of Sale) Client Logic =====
        let posCart = [];
        let transactions = [];
        let transactionsCurrentPage = 1;

        function initPOS() {
            posCart = [];
            document.getElementById('posBarcodeScanner').value = '';
            document.getElementById('posSearchInput').value = '';
            document.getElementById('posCategoryFilter').value = 'all';
            document.getElementById('input_posCategoryFilter').value = '';
            document.getElementById('posMachineFilter').value = 'all';
            document.getElementById('input_posMachineFilter').value = '';
            
            // Reset mobile inputs
            const mRequester = document.getElementById('mobile_pos_requester');
            if (mRequester) {
                mRequester.value = (isLoggedIn && currentUser) ? (currentUser.fullName || '') : '';
            }
            const mDept = document.getElementById('mobile_pos_department');
            if (mDept) {
                mDept.value = (isLoggedIn && currentUser) ? (currentUser.department || '') : '';
            }
            const mNote = document.getElementById('mobile_pos_note');
            if (mNote) mNote.value = '';



            // Reset mobile cart state
            isMobileCartOpen = false;
            if (typeof toggleMobileCart === 'function') {
                toggleMobileCart(false);
            }

            // Focus barcode input
            setTimeout(() => {
                const scanner = document.getElementById('posBarcodeScanner');
                if (scanner) scanner.focus();
            }, 100);

            // รีเซ็ตแท็บกลับมาหน้าเลือกอะไหล่บนมือถือ
            if (typeof switchPOSTab === 'function') switchPOSTab('products');

            renderPOSGrid();
            updatePOSCartUI();
        }

        function renderPOSGrid() {
            const grid = document.getElementById('posProductGrid');
            const searchKeyword = document.getElementById('posSearchInput').value.toLowerCase();
            const keywords = searchKeyword.split(/\s+/).filter(k => k.length > 0);
            const selectedCategory = document.getElementById('posCategoryFilter').value;
            const selectedMachine = document.getElementById('posMachineFilter') ? document.getElementById('posMachineFilter').value : 'all';
            
            grid.innerHTML = '';
            
            // Build map of machine IDs for mapped products
            let mappedProductIds = new Set();
            if (selectedMachine !== 'all') {
                db.mappings.filter(m => String(m.machine_id) === selectedMachine).forEach(m => mappedProductIds.add(String(m.product_id)));
            }
            
            let filtered = db.products.filter(p => {
                const isCancelled = p.note && (p.note.trim() === 'ยกเลิกใช้' || p.note.includes('ยกเลิกใช้'));
                if (isCancelled) return false;
                
                const textToSearch = `${p.id} ${p.name}`.toLowerCase();
                const matchSearch = keywords.length === 0 || keywords.every(kw => textToSearch.includes(kw));
                const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
                const matchMachine = selectedMachine === 'all' || mappedProductIds.has(String(p.id));
                return matchSearch && matchCategory && matchMachine;
            });
            
            if (filtered.length === 0) {
                grid.innerHTML = `<div class="col-span-full py-10 flex flex-col items-center justify-center text-gray-400"><i class="fa-solid fa-box-open text-3xl mb-2 opacity-55"></i><p class="text-xs">ไม่พบอะไหล่ตามเงื่อนไข</p></div>`;
                return;
            }
            
            // เรียงรายการที่มีของมาแสดงก่อน (stock_qty > 0)
            filtered.sort((a, b) => {
                const stockA = a.stock_qty > 0 ? 1 : 0;
                const stockB = b.stock_qty > 0 ? 1 : 0;
                if (stockA !== stockB) {
                    return stockB - stockA; // มีสต็อกขึ้นก่อน
                }
                return String(a.id).localeCompare(String(b.id)); // เรียงตาม ID ย่อย
            });

            filtered.forEach(p => {
                let imgSource = p.image_url ? p.image_url : `https://placehold.co/200x150/f8fafc/94a3b8?text=No+Image`;
                const costVal = parseFloat(String(p.cost).replace(/,/g, '')) || 0;
                const pA = fNumberM(p.price_a, costVal * 2.1);
                
                // เช็คยอดสต็อกและจัดแต่งหน้าตา
                let cardClass = "";
                let imageOverlayHtml = "";
                let stockStatusHtml = "";
                let isOutOfStock = p.stock_qty <= 0;
                
                if (isOutOfStock) {
                    cardClass = "bg-red-50/20 border-red-200 hover:border-red-300 cursor-not-allowed opacity-75";
                    imageOverlayHtml = `
                        <div class="absolute inset-0 bg-red-50/20 backdrop-blur-[0.5px] flex items-center justify-center z-10 pointer-events-none">
                            <span class="bg-red-600/90 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg shadow-md border border-white tracking-wider uppercase transform -rotate-12 select-none">
                                OUT OF STOCK
                            </span>
                        </div>
                    `;
                    stockStatusHtml = `<span class="text-[10px] font-bold text-red-600 bg-red-50 border border-red-150 px-2 py-0.5 rounded-md">คลัง: 0</span>`;
                } else {
                    cardClass = "bg-white border-gray-200 hover:border-amber-400 shadow-sm hover:-translate-y-0.5 cursor-pointer";
                    if (p.stock_qty <= 5) {
                        stockStatusHtml = `<span class="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-150 px-2 py-0.5 rounded-md">เหลือน้อย: ${p.stock_qty}</span>`;
                    } else {
                        stockStatusHtml = `<span class="text-[10px] font-bold text-green-600 bg-green-50 border border-green-150 px-2 py-0.5 rounded-md">คลัง: ${p.stock_qty}</span>`;
                    }
                }
                
                let itemHtml = `
                    <div onclick="${isOutOfStock ? 'showToast(\'สินค้าชิ้นนี้หมดสต็อก\', \'error\')' : `showPOSQuantityPopup('${escapeForJS(p.id)}')`}" 
                         class="${cardClass} p-3 rounded-xl border flex flex-col justify-between transition-all duration-300 relative">
                        <div class="h-24 bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center mb-2 relative">
                            <img src="${escapeHTML(imgSource)}" class="max-h-full max-w-full object-contain p-1 ${isOutOfStock ? 'filter grayscale-[30%] opacity-55' : ''}" onerror="this.src='https://placehold.co/200x150/f8fafc/94a3b8?text=Err'">
                            <span class="absolute top-1 left-1 bg-slate-900/80 backdrop-blur text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded z-10">${escapeHTML(p.id)}</span>
                            ${imageOverlayHtml}
                        </div>
                        <div class="flex-1 flex flex-col justify-between">
                            <div>
                                <h4 class="text-xs font-bold ${isOutOfStock ? 'text-gray-500' : 'text-gray-800'} line-clamp-2 min-h-[32px] leading-tight mb-1" title="${escapeHTML(p.name)}">${escapeHTML(p.name)}</h4>
                                <div class="flex justify-between items-center mb-2">
                                    <span class="text-[10px] text-gray-400 truncate max-w-[70%]">${escapeHTML(p.category || 'ทั่วไป')}</span>
                                    <span class="text-[9px] text-gray-400 font-bold uppercase">${escapeHTML(p.unit || 'ชิ้น')}</span>
                                </div>
                            </div>
                            <div class="flex justify-between items-center mt-auto border-t border-slate-50 pt-2">
                                <span class="font-extrabold ${isOutOfStock ? 'text-gray-400' : 'text-blue-600'} text-xs sm:text-sm">฿${pA}</span>
                                ${stockStatusHtml}
                            </div>
                        </div>
                    </div>
                `;
                grid.insertAdjacentHTML('beforeend', itemHtml);
            });
        }

        // คีย์บอร์ด ดักจับยิงเครื่องบาร์โค้ด
        function handlePOSBarcode(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                const barcode = event.target.value.trim();
                if (!barcode) return;
                
                // ค้นหาอะไหล่
                const p = db.products.find(x => String(x.id).toLowerCase() === barcode.toLowerCase());
                if (p) {
                    const isCancelled = p.note && (p.note.trim() === 'ยกเลิกใช้' || p.note.includes('ยกเลิกใช้'));
                    if (isCancelled) {
                        showToast("ไม่สามารถเบิกอะไหล่ชิ้นนี้ได้ เนื่องจากถูกระงับใช้ชั่วคราว", "error");
                    } else if (p.stock_qty <= 0) {
                        showToast(`ไม่สามารถเพิ่มอะไหล่ได้ เนื่องจากอะไหล่รหัส ${p.id} หมดสต็อก`, "error");
                    } else {
                        showPOSQuantityPopup(p.id);
                    }
                } else {
                    showToast(`ไม่พบรหัสสินค้า "${barcode}" ในระบบ`, "error");
                }
                event.target.value = '';
                event.target.focus();
            }
        }

        function showPOSQuantityPopup(productId) {
            const p = db.products.find(x => x.id == productId);
            if (!p) return;
            
            const isCancelled = p.note && (p.note.trim() === 'ยกเลิกใช้' || p.note.includes('ยกเลิกใช้'));
            if (isCancelled) {
                showToast("ไม่สามารถเบิกอะไหล่ชิ้นนี้ได้ เนื่องจากถูกระงับใช้ชั่วคราว", "error");
                return;
            }
            if (p.stock_qty <= 0) {
                showToast(`ไม่สามารถเพิ่มอะไหล่ได้ เนื่องจากอะไหล่รหัส ${p.id} หมดสต็อก`, "error");
                return;
            }

            const existing = posCart.find(item => item.id == productId);
            const existingQty = existing ? existing.qty : 0;
            const maxAvailable = p.stock_qty - existingQty;

            if (maxAvailable <= 0) {
                showToast(`สินค้าในตะกร้าเท่ากับจำนวนสต็อกที่มีแล้ว (มีคลัง ${p.stock_qty} ${p.unit || 'ชิ้น'})`, "error");
                return;
            }

            Swal.fire({
                title: 'ระบุจำนวนที่ต้องการเบิก',
                html: `
                    <div class="text-left space-y-2.5">
                        <div class="bg-slate-50 p-3 rounded-xl border border-gray-150 flex gap-3 items-center">
                            <img src="${escapeHTML(p.image_url || 'https://placehold.co/200x150/f8fafc/94a3b8?text=No+Image')}" class="w-14 h-14 object-contain rounded-lg border bg-white flex-shrink-0" onerror="this.src='https://placehold.co/200x150/f8fafc/94a3b8?text=Err'">
                            <div class="min-w-0 flex-1">
                                <span class="text-[9px] font-mono bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">${escapeHTML(p.id)}</span>
                                <h4 class="text-xs font-bold text-slate-800 truncate mt-1">${escapeHTML(p.name)}</h4>
                                <p class="text-[10px] text-slate-500 mt-0.5">ประเภท: ${escapeHTML(p.category || 'ทั่วไป')} | หน่วยนับ: ${escapeHTML(p.unit || 'ชิ้น')}</p>
                            </div>
                        </div>
                        <div class="flex justify-between items-center text-xs px-1">
                            <span class="text-gray-500 font-medium">สต็อกคงเหลือในคลัง:</span>
                            <span class="font-bold text-green-600">${p.stock_qty} ${p.unit || 'ชิ้น'}</span>
                        </div>
                        ${existingQty > 0 ? `
                        <div class="flex justify-between items-center text-xs px-1 border-t border-slate-100 pt-1.5">
                            <span class="text-gray-500 font-medium">มีอยู่ในตะกร้าแล้ว:</span>
                            <span class="font-bold text-blue-600">${existingQty} ${p.unit || 'ชิ้น'}</span>
                        </div>
                        ` : ''}
                    </div>
                `,
                input: 'number',
                inputAttributes: {
                    min: 1,
                    max: maxAvailable,
                    step: 1
                },
                inputValue: 1,
                showCancelButton: true,
                confirmButtonText: 'ใส่ตะกร้า',
                cancelButtonText: 'ยกเลิก',
                confirmButtonColor: '#d97706', // amber-600
                cancelButtonColor: '#6e7881',
                inputValidator: (value) => {
                    const qty = parseInt(value);
                    if (isNaN(qty) || qty <= 0) {
                        return 'กรุณาระบุจำนวนที่ถูกต้องอย่างน้อย 1 ชิ้น';
                    }
                    if (qty > maxAvailable) {
                        return `ระบุเกินจำนวนที่เบิกได้ (เบิกเพิ่มได้สูงสุด ${maxAvailable} ${p.unit || 'ชิ้น'})`;
                    }
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    const qtyToAdd = parseInt(result.value);
                    addToPOSCartWithQty(productId, qtyToAdd);
                    showToast(`เพิ่มอะไหล่ ${p.id} จำนวน ${qtyToAdd} ${p.unit || 'ชิ้น'} สำเร็จ`, "success");
                }
            });
        }

        function addToPOSCartWithQty(productId, qty) {
            const p = db.products.find(x => x.id == productId);
            if (!p) return;
            
            const existing = posCart.find(item => item.id == productId);
            if (existing) {
                existing.qty += qty;
            } else {
                const costVal = parseFloat(String(p.cost).replace(/,/g, '')) || 0;
                
                let selectedPrice = 0;
                const userPriceLevel = (currentUser && currentUser.priceLevel) ? currentUser.priceLevel : 'A';
                
                if (userPriceLevel === 'B') {
                    selectedPrice = parseFloat(p.price_b) > 0 ? parseFloat(p.price_b) : (costVal * 1.7);
                } else if (userPriceLevel === 'C') {
                    selectedPrice = parseFloat(p.price_c) > 0 ? parseFloat(p.price_c) : (costVal * 1.3);
                } else if (userPriceLevel === 'COST') {
                    selectedPrice = costVal;
                } else {
                    selectedPrice = parseFloat(p.price_a) > 0 ? parseFloat(p.price_a) : (costVal * 2.1);
                }
                
                posCart.push({
                    id: p.id,
                    name: p.name,
                    unit: p.unit || 'ชิ้น',
                    price: selectedPrice,
                    maxStock: p.stock_qty,
                    qty: qty
                });
            }
            updatePOSCartUI();
        }

        function updatePOSCartItemQty(productId, newQty) {
            const item = posCart.find(x => x.id == productId);
            if (!item) return;
            
            const qty = parseInt(newQty) || 0;
            if (qty <= 0) {
                removeFromPOSCart(productId);
                return;
            }
            
            if (qty > item.maxStock) {
                showToast(`ไม่สามารถระบุจำนวนเบิกเกินสต็อกที่มีอยู่ได้ (มีคลัง ${item.maxStock} ${item.unit})`, "error");
                item.qty = item.maxStock;
            } else {
                item.qty = qty;
            }
            updatePOSCartUI();
        }

        function removeFromPOSCart(productId) {
            posCart = posCart.filter(item => item.id != productId);
            updatePOSCartUI();
        }

        function clearPOSCart() {
            posCart = [];
            updatePOSCartUI();
        }

        function updatePOSCartUI() {
            const list = document.getElementById('posCartList');
            const checkoutBtn = document.getElementById('posCheckoutBtn');
            const cartCountEl = document.getElementById('posCartCount');
            const cartTotalEl = document.getElementById('posCartTotal');
            
            // Mobile elements
            const mobileBadge = document.getElementById('mobileCartBadge');
            const mobileSubtitle = document.getElementById('mobileCartSubtitle');
            const mobileList = document.getElementById('mobileCartItemsList');
            const mobileTotalQtyEl = document.getElementById('mobileCartTotalQty');
            const mobileCheckoutBtn = document.getElementById('mobilePOSCheckoutBtn');
            
            list.innerHTML = '';
            
            if (posCart.length === 0) {
                list.innerHTML = `
                    <div class="h-full flex flex-col items-center justify-center py-20 text-slate-500">
                        <i class="fa-solid fa-shopping-basket text-5xl mb-4 opacity-40"></i>
                        <p class="text-xs">ตะกร้าว่างเปล่า</p>
                        <p class="text-[10px] opacity-75 mt-1 text-center">คลิกเลือกรายการอะไหล่<br>หรือพิมพ์สแกนรหัสเพื่อเบิก</p>
                    </div>
                `;
                checkoutBtn.disabled = true;
                cartCountEl.textContent = '0 รายการ (0 ชิ้น)';
                cartTotalEl.textContent = '฿0.00';
                
                // Update Mobile UI for empty cart
                if (mobileBadge) mobileBadge.textContent = '0';
                if (mobileSubtitle) mobileSubtitle.textContent = 'มี 0 ชิ้นในตะกร้า';
                if (mobileTotalQtyEl) mobileTotalQtyEl.textContent = '0';
                if (mobileCheckoutBtn) mobileCheckoutBtn.disabled = true;
                if (mobileList) {
                    mobileList.innerHTML = `
                        <div class="py-8 text-center text-gray-400 text-xs">
                            <i class="fa-solid fa-shopping-basket text-3xl mb-2 opacity-30"></i>
                            <p>ไม่มีสินค้าในตะกร้า</p>
                        </div>
                    `;
                }
                
                // Close/Hide the bottom sheet on mobile if empty
                if (typeof toggleMobileCart === 'function') {
                    toggleMobileCart(isMobileCartOpen);
                }
                return;
            }
            
            checkoutBtn.disabled = false;
            let total = 0;
            let totalQty = 0;
            
            posCart.forEach(item => {
                const subtotal = item.price * item.qty;
                total += subtotal;
                totalQty += item.qty;
                
                let itemHtml = `
                    <div class="bg-slate-800/80 border border-slate-700/50 p-3 rounded-xl flex items-center justify-between gap-3 relative transition-all">
                        <div class="flex-1 min-w-0">
                            <div class="flex justify-between items-start gap-1">
                                <span class="text-[9px] font-mono bg-slate-700 text-slate-300 font-bold px-1 py-0.5 rounded block truncate">${escapeHTML(item.id)}</span>
                                <button onclick="removeFromPOSCart('${escapeForJS(item.id)}')" class="text-slate-400 hover:text-red-400 transition" title="ลบรายการ"><i class="fa-solid fa-times text-xs"></i></button>
                            </div>
                            <h5 class="text-xs font-semibold text-slate-100 truncate mt-1.5" title="${escapeHTML(item.name)}">${escapeHTML(item.name)}</h5>
                            
                            <div class="flex items-center justify-between mt-2.5">
                                <span class="text-xs font-bold text-amber-400">฿${(item.price).toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>
                                <div class="flex items-center bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                                    <button type="button" onclick="updatePOSCartItemQty('${escapeForJS(item.id)}', ${item.qty - 1})" class="px-2 py-1 text-slate-400 hover:text-white transition"><i class="fa-solid fa-minus text-[9px]"></i></button>
                                    <input type="number" value="${item.qty}" min="1" max="${item.maxStock}" onchange="updatePOSCartItemQty('${escapeForJS(item.id)}', this.value)" class="w-10 bg-transparent text-center text-xs font-bold text-white focus:outline-none border-none py-0.5 p-0">
                                    <button type="button" onclick="updatePOSCartItemQty('${escapeForJS(item.id)}', ${item.qty + 1})" class="px-2 py-1 text-slate-400 hover:text-white transition"><i class="fa-solid fa-plus text-[9px]"></i></button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                list.insertAdjacentHTML('beforeend', itemHtml);
            });
            
            cartCountEl.textContent = `${posCart.length} รายการ (${totalQty} ชิ้น)`;
            cartTotalEl.textContent = '฿' + total.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});

            // Update Mobile UI for non-empty cart
            if (mobileBadge) mobileBadge.textContent = totalQty;
            if (mobileSubtitle) mobileSubtitle.textContent = `มี ${totalQty} ชิ้นในตะกร้า`;
            if (mobileTotalQtyEl) mobileTotalQtyEl.textContent = totalQty;
            if (mobileCheckoutBtn) mobileCheckoutBtn.disabled = false;
            
            if (mobileList) {
                mobileList.innerHTML = '';
                posCart.forEach(item => {
                    const itemHtml = `
                        <div class="bg-white p-3 rounded-xl border border-gray-150 flex items-center justify-between gap-3 shadow-sm">
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-1.5">
                                    <span class="text-[9px] font-mono bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded">${escapeHTML(item.id)}</span>
                                </div>
                                <h5 class="text-xs font-bold text-slate-800 truncate mt-1.5">${escapeHTML(item.name)}</h5>
                                <span class="text-xs font-extrabold text-blue-600 mt-1 block">฿${(item.price).toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>
                            </div>
                            <div class="flex flex-col items-end justify-between gap-2.5">
                                <button onclick="removeFromPOSCart('${escapeForJS(item.id)}')" class="text-gray-400 hover:text-red-500 transition p-1" title="ลบรายการ"><i class="fa-solid fa-trash-alt text-xs"></i></button>
                                <div class="flex items-center bg-slate-100 rounded-lg border border-gray-200 overflow-hidden">
                                    <button type="button" onclick="updatePOSCartItemQty('${escapeForJS(item.id)}', ${item.qty - 1})" class="px-2 py-0.5 text-gray-500 hover:text-black transition"><i class="fa-solid fa-minus text-[8px]"></i></button>
                                    <span class="px-2.5 bg-white text-center text-xs font-bold text-slate-850 border-x border-gray-250 min-w-[32px]">${item.qty}</span>
                                    <button type="button" onclick="updatePOSCartItemQty('${escapeForJS(item.id)}', ${item.qty + 1})" class="px-2 py-0.5 text-gray-500 hover:text-black transition"><i class="fa-solid fa-plus text-[8px]"></i></button>
                                </div>
                            </div>
                        </div>
                    `;
                    mobileList.insertAdjacentHTML('beforeend', itemHtml);
                });
            }
            
            // Adjust/update position of bottom sheet if closed/partially visible
            if (typeof toggleMobileCart === 'function') {
                toggleMobileCart(isMobileCartOpen);
            }

            // อัปเดตตัวเลขแจ้งเตือน (Badge) บนแท็บมือถือ
            const tabBadge = document.getElementById('posTabCartBadge');
            if (tabBadge) {
                if (posCart.length > 0) {
                    tabBadge.textContent = posCart.length;
                    tabBadge.classList.remove('hidden');
                } else {
                    tabBadge.classList.add('hidden');
                }
            }
        }

        function switchPOSTab(tab) {
            const tabProductsBtn = document.getElementById('posTabProducts');
            const tabCartBtn = document.getElementById('posTabCart');
            const leftPanel = document.getElementById('posLeftPanel');
            const rightPanel = document.getElementById('posRightPanel');
            
            if (!tabProductsBtn || !tabCartBtn || !leftPanel || !rightPanel) return;
            
            if (tab === 'products') {
                // เลือกแท็บแสดงอะไหล่
                tabProductsBtn.className = 'flex-1 py-2 px-3 rounded-lg text-xs font-bold text-center transition-all bg-white text-blue-600 shadow-sm';
                tabCartBtn.className = 'flex-1 py-2 px-3 rounded-lg text-xs font-bold text-center transition-all text-gray-500 hover:text-gray-700 relative';
                
                leftPanel.classList.remove('hidden');
                leftPanel.classList.add('flex');
                
                rightPanel.classList.add('hidden');
                rightPanel.classList.remove('flex');
            } else {
                // เลือกแท็บแสดงตะกร้าเบิกจ่าย
                tabCartBtn.className = 'flex-1 py-2 px-3 rounded-lg text-xs font-bold text-center transition-all bg-white text-blue-600 shadow-sm relative';
                tabProductsBtn.className = 'flex-1 py-2 px-3 rounded-lg text-xs font-bold text-center transition-all text-gray-500 hover:text-gray-700';
                
                leftPanel.classList.add('hidden');
                leftPanel.classList.remove('flex');
                
                rightPanel.classList.remove('hidden');
                rightPanel.classList.add('flex');
            }
        }

        function openPOSCheckoutModal() {
            if (posCart.length === 0) return;
            
            document.getElementById('formPOSCheckout').reset();
            
            if (isLoggedIn && currentUser) {
                document.getElementById('pos_requester').value = currentUser.fullName || '';
                document.getElementById('pos_department').value = currentUser.department || '';
            }
            
            // Populate machines datalist
            const datalist = document.getElementById('pos_machines_list');
            if (datalist) {
                datalist.innerHTML = '';
                if (db && Array.isArray(db.machines)) {
                    db.machines.forEach(m => {
                        datalist.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(m.id)}">${escapeHTML(m.id)} : ${escapeHTML(m.name)}</option>`);
                    });
                }
            }
            
            document.getElementById('posCheckoutModal').classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }

        function closePOSCheckoutModal() {
            document.getElementById('posCheckoutModal').classList.add('hidden');
            document.body.style.overflow = '';
        }

        function toggleMobileCart(open) {
            const bottomSheet = document.getElementById('posMobileBottomSheet');
            const backdrop = document.getElementById('posMobileBottomSheetBackdrop');
            const chevron = document.getElementById('mobileCartChevron');
            
            if (!bottomSheet || !backdrop) return;
            
            if (open === undefined) {
                isMobileCartOpen = !isMobileCartOpen;
            } else {
                isMobileCartOpen = open;
            }
            
            if (isMobileCartOpen) {
                bottomSheet.classList.remove('translate-y-full');
                bottomSheet.classList.remove('translate-y-[calc(100%-80px)]');
                bottomSheet.classList.add('translate-y-0');
                backdrop.classList.remove('hidden');
                if (chevron) {
                    chevron.classList.remove('fa-chevron-up');
                    chevron.classList.add('fa-chevron-down');
                }
                
                // Populate mobile machines datalist
                const datalist = document.getElementById('mobile_pos_machines_list');
                if (datalist) {
                    datalist.innerHTML = '';
                    if (db && Array.isArray(db.machines)) {
                        db.machines.forEach(m => {
                            datalist.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(m.id)}">${escapeHTML(m.id)} : ${escapeHTML(m.name)}</option>`);
                        });
                    }
                }
                
                // Pre-fill requester and department if logged in
                if (isLoggedIn && currentUser) {
                    const reqInput = document.getElementById('mobile_pos_requester');
                    if (reqInput && !reqInput.value) reqInput.value = currentUser.fullName || '';
                    
                    const depInput = document.getElementById('mobile_pos_department');
                    if (depInput && !depInput.value) depInput.value = currentUser.department || '';
                }
            } else {
                backdrop.classList.add('hidden');
                if (posCart && posCart.length > 0) {
                    bottomSheet.classList.remove('translate-y-full');
                    bottomSheet.classList.remove('translate-y-0');
                    bottomSheet.classList.add('translate-y-[calc(100%-80px)]');
                } else {
                    bottomSheet.classList.remove('translate-y-[calc(100%-80px)]');
                    bottomSheet.classList.remove('translate-y-0');
                    bottomSheet.classList.add('translate-y-full');
                }
                if (chevron) {
                    chevron.classList.remove('fa-chevron-down');
                    chevron.classList.add('fa-chevron-up');
                }
            }
        }

        async function legacy_submitMobilePOSCheckout() {
            if (posCart.length === 0) return;
            
            const requester = document.getElementById('mobile_pos_requester').value.trim();
            const department = document.getElementById('mobile_pos_department').value.trim();
            const machineId = ""; // No machine selection
            const note = document.getElementById('mobile_pos_note').value.trim();
            
            if (!requester) {
                showToast("กรุณาระบุชื่อ-สกุล ผู้เบิก", "error");
                return;
            }
            if (!department) {
                showToast("กรุณาระบุแผนก/ฝ่ายงาน", "error");
                return;
            }
            if (!note) {
                showToast("กรุณาระบุวัตถุประสงค์การเบิก / หมายเหตุ", "error");
                return;
            }
            
            let total = 0;
            const userPriceLevel = (currentUser && currentUser.priceLevel) ? currentUser.priceLevel : 'A';
            const cartItems = posCart.map(item => {
                total += item.price * item.qty;
                return {
                    id: item.id,
                    qty: item.qty,
                    price: item.price,
                    priceLevel: userPriceLevel
                };
            });
            
            const payload = {
                requester: requester,
                department: department,
                machine_id: machineId,
                note: note,
                total_price: total,
                cart: cartItems
            };
            
            showLoading('กำลังบันทึกรายการและปรับปรุงสต็อก...');
            try {
                let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'checkoutOrder', payload: payload }) });
                let result = await res.json();
                
                if (result.status === 'success') {
                    // Reset mobile inputs
                    document.getElementById('mobile_pos_requester').value = '';
                    document.getElementById('mobile_pos_department').value = '';
                    document.getElementById('mobile_pos_note').value = '';
                    
                    isMobileCartOpen = false;
                    toggleMobileCart(false);
                    clearPOSCart();
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'บันทึกใบเบิกสำเร็จ!',
                        html: `เลขที่ใบเบิก: <strong class="text-blue-600">${result.data.transaction_id}</strong><br>ระบบได้ปรับปรุงยอดคงเหลือในสต็อกเรียบร้อยแล้ว`,
                        showDenyButton: true,
                        confirmButtonText: '<i class="fa-solid fa-print"></i> พิมพ์ใบเบิก (สลิป)',
                        denyButtonText: 'ปิดหน้าต่าง',
                        confirmButtonColor: '#10b981',
                        denyButtonColor: '#6e7881'
                    }).then((swalRes) => {
                        if (swalRes.isConfirmed) {
                            const now = new Date();
                            const yyyy = now.getFullYear();
                            const mm = String(now.getMonth() + 1).padStart(2, '0');
                            const dd = String(now.getDate()).padStart(2, '0');
                            const hh = String(now.getHours()).padStart(2, '0');
                            const min = String(now.getMinutes()).padStart(2, '0');
                            const ss = String(now.getSeconds()).padStart(2, '0');
                            const dateStr = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;

                            const printedTx = {
                                id: result.data.transaction_id,
                                date: dateStr,
                                requester: requester,
                                department: department,
                                machine_id: machineId,
                                note: note,
                                items: cartItems.map(item => ({
                                    product_id: item.id,
                                    qty: item.qty,
                                    price: item.price
                                }))
                            };
                            printPOSSlip(printedTx);
                        }
                        switchView('view-transactions');
                        loadTransactions();
                    });
                } else {
                    showToast(result.message || 'บันทึกข้อมูลไม่สำเร็จ', 'error');
                }
            } catch (e) {
                console.error(e);
                showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
            }
        }

        let html5QrCode = null;
        let activeCameraId = "";
        let cameraList = [];

        function openCameraScanner() {
            document.getElementById('cameraScannerModal').classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            
            const selectEl = document.getElementById('cameraSelect');
            selectEl.innerHTML = '<option value="">กำลังดึงข้อมูลกล้อง...</option>';
            
            Html5Qrcode.getCameras().then(devices => {
                if (devices && devices.length > 0) {
                    cameraList = devices;
                    selectEl.innerHTML = '';
                    devices.forEach((device, index) => {
                        let label = device.label || `กล้อง ${index + 1}`;
                        selectEl.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(device.id)}">${escapeHTML(label)}</option>`);
                    });
                    
                    let defaultCamera = devices[0].id;
                    const backCam = devices.find(device => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('environment') || device.label.toLowerCase().includes('หลัง'));
                    if (backCam) {
                        defaultCamera = backCam.id;
                    }
                    
                    selectEl.value = defaultCamera;
                    startCamera(defaultCamera);
                } else {
                    selectEl.innerHTML = '<option value="">ไม่พบอุปกรณ์กล้อง</option>';
                    showToast("ไม่พบอุปกรณ์กล้องบนเครื่องนี้", "error");
                }
            }).catch(err => {
                console.error(err);
                selectEl.innerHTML = '<option value="">ไม่มีสิทธิ์เข้าถึงกล้อง</option>';
                showToast("ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตสิทธิ์เข้าถึงกล้องในเบราว์เซอร์", "error");
            });
        }

        function startCamera(cameraId) {
            if (html5QrCode) {
                html5QrCode.stop().then(() => {
                    _startCameraInstance(cameraId);
                }).catch(err => {
                    console.error("Error stopping scanner before restart:", err);
                    _startCameraInstance(cameraId);
                });
            } else {
                _startCameraInstance(cameraId);
            }
        }

        function _startCameraInstance(cameraId) {
            activeCameraId = cameraId;
            html5QrCode = new Html5Qrcode("qr-reader");
            
            const config = {
                fps: 10,
                qrbox: (width, height) => {
                    const size = Math.min(width, height) * 0.7;
                    return { width: size, height: size };
                },
                aspectRatio: 1.0
            };
            
            html5QrCode.start(
                cameraId, 
                config,
                (decodedText, decodedResult) => {
                    const scannedCode = decodedText.trim();
                    if (scannedCode) {
                        if (typeof showToast === 'function') {
                            showToast(`สแกนรหัส "${scannedCode}" สำเร็จ`, "success");
                        }
                        
                        closeCameraScanner();
                        
                        const p = db.products.find(x => String(x.id).toLowerCase() === scannedCode.toLowerCase());
                        if (p) {
                            showPOSQuantityPopup(p.id);
                        } else {
                            showToast(`ไม่พบรหัสสินค้า "${scannedCode}" ในระบบ`, "error");
                        }
                    }
                },
                (errorMessage) => {
                    // Verbose error logging
                }
            ).catch(err => {
                console.error("Error starting camera scanner:", err);
                showToast("เริ่มกล้องสแกนไม่สำเร็จ", "error");
            });
        }

        function switchCamera(cameraId) {
            if (cameraId) {
                startCamera(cameraId);
            }
        }

        function closeCameraScanner() {
            document.getElementById('cameraScannerModal').classList.add('hidden');
            document.body.style.overflow = '';
            
            if (html5QrCode) {
                html5QrCode.stop().then(() => {
                    html5QrCode = null;
                }).catch(err => {
                    console.error("Error stopping camera scanner:", err);
                    html5QrCode = null;
                });
            }
        }

        async function submitPOSCheckout(e) {
            e.preventDefault();
            if (posCart.length === 0) return;
            
            const requester = document.getElementById('pos_requester').value.trim();
            const department = document.getElementById('pos_department').value.trim();
            const machineId = document.getElementById('pos_machine').value.trim();
            const serialNumber = document.getElementById('pos_serial_number').value.trim();
            const note = document.getElementById('pos_note').value.trim();

            if (!requester || !department || !machineId || !serialNumber || !note) {
                showToast("กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง", "error");
                return;
            }
            
            let total = 0;
            const userPriceLevel = (currentUser && currentUser.priceLevel) ? currentUser.priceLevel : 'A';
            const cartItems = posCart.map(item => {
                total += item.price * item.qty;
                return {
                    id: item.id,
                    qty: item.qty,
                    price: item.price,
                    priceLevel: userPriceLevel
                };
            });
            
            const payload = {
                requester: requester,
                department: department,
                machine_id: machineId,
                serial_number: serialNumber,
                note: note,
                total_price: total,
                cart: cartItems
            };
            
            showLoading('กำลังบันทึกรายการและปรับปรุงสต็อก...');
            try {
                let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'checkoutOrder', payload: payload }) });
                let result = await res.json();
                
                if (result.status === 'success') {
                    closePOSCheckoutModal();
                    clearPOSCart();
                    
                    // แจ้งเบิกสำเร็จพร้อมเลขใบเบิก
                    Swal.fire({
                        icon: 'success',
                        title: 'ทำรายการเบิกจ่ายสำเร็จ!',
                        text: 'รหัสอ้างอิงใบเบิก: ' + result.data.transaction_id,
                        confirmButtonText: 'ตกลง',
                        confirmButtonColor: '#2563eb',
                        customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-xl font-bold' }
                    });
                    
                    // ดึงข้อมูลใหม่
                    await fetchData(false);
                    // อัพเดตตาราง POS อีกรอบเพื่อตัดสต็อกหน้าจอทันที
                    renderPOSGrid();
                } else {
                    showToast('เกิดข้อผิดพลาด: ' + result.message, 'error');
                }
            } catch (err) {
                showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อบันทึกรายการได้', 'error');
            }
            hideLoading();
        }

        async function submitMobilePOSCheckout() {
            if (posCart.length === 0) return;
            
            const requester = document.getElementById('mobile_pos_requester').value.trim();
            const department = document.getElementById('mobile_pos_department').value.trim();
            const machineId = document.getElementById('mobile_pos_machine').value.trim();
            const serialNumber = document.getElementById('mobile_pos_serial_number').value.trim();
            const note = document.getElementById('mobile_pos_note').value.trim();
            
            if (!requester) {
                showToast("กรุณาระบุชื่อ-สกุล ผู้เบิก", "error");
                return;
            }
            if (!department) {
                showToast("กรุณาระบุแผนก/ฝ่ายงาน", "error");
                return;
            }
            if (!machineId) {
                showToast("กรุณาระบุเครื่องจักร", "error");
                return;
            }
            if (!serialNumber) {
                showToast("กรุณาระบุ Serial Number", "error");
                return;
            }
            if (!note) {
                showToast("กรุณาระบุวัตถุประสงค์การเบิก / หมายเหตุ", "error");
                return;
            }
            
            let total = 0;
            const userPriceLevel = (currentUser && currentUser.priceLevel) ? currentUser.priceLevel : 'A';
            const cartItems = posCart.map(item => {
                total += item.price * item.qty;
                return {
                    id: item.id,
                    qty: item.qty,
                    price: item.price,
                    priceLevel: userPriceLevel
                };
            });
            
            const payload = {
                requester: requester,
                department: department,
                machine_id: machineId,
                serial_number: serialNumber,
                note: note,
                total_price: total,
                cart: cartItems
            };
            
            showLoading('กำลังบันทึกรายการและปรับปรุงสต็อก...');
            try {
                let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'checkoutOrder', payload: payload }) });
                let result = await res.json();
                
                if (result.status === 'success') {
                    // Reset mobile inputs
                    document.getElementById('mobile_pos_requester').value = '';
                    document.getElementById('mobile_pos_department').value = '';
                    document.getElementById('mobile_pos_machine').value = '';
                    document.getElementById('mobile_pos_serial_number').value = '';
                    document.getElementById('mobile_pos_note').value = '';
                    
                    isMobileCartOpen = false;
                    toggleMobileCart(false);
                    clearPOSCart();
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'บันทึกใบเบิกสำเร็จ!',
                        html: `เลขที่ใบเบิก: <strong class="text-blue-600">${result.data.transaction_id}</strong><br>ระบบได้ปรับปรุงยอดคงเหลือในสต็อกเรียบร้อยแล้ว`,
                        showDenyButton: true,
                        confirmButtonText: '<i class="fa-solid fa-print"></i> พิมพ์ใบเบิก (สลิป)',
                        denyButtonText: 'ปิดหน้าต่าง',
                        confirmButtonColor: '#10b981',
                        denyButtonColor: '#6e7881'
                    }).then((swalRes) => {
                        if (swalRes.isConfirmed) {
                            const now = new Date();
                            const yyyy = now.getFullYear();
                            const mm = String(now.getMonth() + 1).padStart(2, '0');
                            const dd = String(now.getDate()).padStart(2, '0');
                            const hh = String(now.getHours()).padStart(2, '0');
                            const min = String(now.getMinutes()).padStart(2, '0');
                            const ss = String(now.getSeconds()).padStart(2, '0');
                            const dateStr = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
 
                            const printedTx = {
                                id: result.data.transaction_id,
                                date: dateStr,
                                requester: requester,
                                department: department,
                                machine_id: machineId,
                                serial_number: serialNumber,
                                note: note,
                                items: cartItems.map(item => ({
                                    product_id: item.id,
                                    qty: item.qty,
                                    price: item.price
                                }))
                            };
                            printPOSSlip(printedTx);
                        }
                        switchView('view-transactions');
                        loadTransactions();
                    });
                } else {
                    showToast(result.message || 'บันทึกข้อมูลไม่สำเร็จ', 'error');
                }
            } catch (e) {
                console.error(e);
                showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
            }
            hideLoading();
        }

        // ===== Transactions History Client Logic =====
        async function loadTransactions() {
            showLoading('กำลังโหลดประวัติใบเบิกอะไหล่...');
            try {
                let transRes = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getTransactions' }) });
                let result = await transRes.json();
                if (result.status === 'success') {
                    transactions = result.data || [];
                    renderTransactionsTable();
                } else {
                    showToast('ดึงข้อมูลประวัติไม่สำเร็จ: ' + result.message, 'error');
                }
            } catch (err) {
                showToast('ไม่สามารถดึงข้อมูลประวัติจากเครือข่ายได้', 'error');
            }
            hideLoading();
        }

        function handleTransactionFilterChange() {
            transactionsCurrentPage = 1;
            renderTransactionsTable();
        }

        function renderTransactionsTable() {
            const tbody = document.getElementById('transactionTableBody');
            const searchKeyword = (document.getElementById('searchTransactionInput')?.value || '').toLowerCase();
            const keywords = searchKeyword.split(/\s+/).filter(k => k.length > 0);
            const statusFilter = (document.getElementById('filterTransactionStatus')?.value) || 'all';
            
            if (!tbody) return;
            tbody.innerHTML = '';

            // กรองข้อมูลสำหรับบทบาทั่วไป ให้เห็นเฉพาะของตัวเอง และเอาเฉพาะข้อมูลเบิกจ่าย (ไม่ใช่ Restock/รับเข้า)
            let transactionsToRender = transactions.filter(t => t.status !== 'Restock' && t.machine_id !== 'PO_RECEIVE' && t.machine_id !== 'RESTOCK');
            if (isLoggedIn && currentUser && currentUser.role !== 'ADMIN' && currentUser.role !== 'Manager') {
                transactionsToRender = transactionsToRender.filter(t => t.requester === currentUser.fullName);
            }
            
            let filtered = transactionsToRender.filter(t => {
                const textToSearch = `${t.id} ${t.requester} ${t.department}`.toLowerCase();
                const matchSearch = keywords.length === 0 || keywords.every(kw => textToSearch.includes(kw));
                const matchStatus = statusFilter === 'all' || t.status === statusFilter;
                return matchSearch && matchStatus;
            });
            
            const pageSize = 20;
            const totalItems = filtered.length;
            const totalPages = Math.ceil(totalItems / pageSize);

            if (transactionsCurrentPage > totalPages) transactionsCurrentPage = totalPages;
            if (transactionsCurrentPage < 1) transactionsCurrentPage = 1;

            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="9" class="p-10 text-center text-gray-400"><i class="fa-solid fa-receipt text-4xl mb-3 opacity-30 block"></i>ไม่พบข้อมูลใบเบิกที่ค้นหา</td></tr>`;
                renderGenericPagination('transactionsPaginationContainer', 'transactionsPaginationInfo', 'transactionsPaginationControls', 0, 1, pageSize, 'changeTransactionsPage');
                return;
            }
            
            const startIndex = (transactionsCurrentPage - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const paginated = filtered.slice(startIndex, endIndex);

            paginated.forEach((t, index) => {
                const globalIndex = startIndex + index + 1;
                const isCancelled = t.status === 'Cancelled';
                let statusHtml = '';
                if (isCancelled) {
                    statusHtml = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">ยกเลิกใบเบิก</span>`;
                } else if (t.status === 'Restock') {
                    statusHtml = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">เติมสต็อก</span>`;
                } else {
                    statusHtml = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">เบิกจ่ายสำเร็จ</span>`;
                }
                
                const totalVal = t.status === 'Restock' ? '-' : `฿${t.total_price.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                
                let tr = `
                    <tr class="hover:bg-slate-50 transition border-b border-gray-150 last:border-0 ${isCancelled ? 'bg-red-50/10' : ''}">
                        <td class="p-4 text-center text-gray-500">${globalIndex}</td>
                        <td class="p-4 font-bold text-gray-900">${escapeHTML(t.id)}</td>
                        <td class="p-4 text-gray-500 text-xs font-semibold">${escapeHTML(formatDateTimeThai(t.date))}</td>
                        <td class="p-4 text-gray-700 font-semibold">${escapeHTML(t.requester)}</td>
                        <td class="p-4 text-gray-600">${escapeHTML(t.department)}</td>
                        <td class="p-4 text-gray-500 font-medium">${escapeHTML(t.machine_id)}</td>
                        <td class="p-4 text-right font-bold text-blue-600">฿${t.total_price.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td class="p-4 text-center">${statusHtml}</td>
                        <td class="p-4 text-center">
                            <button onclick="openTransactionDetailModal('${escapeForJS(t.id)}')" class="text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5" title="ดูรายละเอียดใบเบิก"><i class="fa-solid fa-eye"></i> รายละเอียด</button>
                        </td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', tr);
            });

            renderGenericPagination('transactionsPaginationContainer', 'transactionsPaginationInfo', 'transactionsPaginationControls', totalItems, transactionsCurrentPage, pageSize, 'changeTransactionsPage');
        }

        window.changeTransactionsPage = function(page) {
            transactionsCurrentPage = page;
            renderTransactionsTable();
        };


        function openTransactionDetailModal(txId) {
            const t = transactions.find(x => x.id === txId);
            if (!t) return;
            
            const isRestock = t.status === 'Restock';
            const isCancelled = t.status === 'Cancelled';
            
            const titleEl = document.getElementById('tdm_title_main');
            const statusLabelEl = document.getElementById('tdm_status_label');
            const requesterLabelEl = document.getElementById('tdm_requester_label');
            const departmentLabelEl = document.getElementById('tdm_department_label');
            const machineLabelEl = document.getElementById('tdm_machine_label');
            const serialLabelEl = document.getElementById('tdm_serial_label');
            const machineContainer = document.getElementById('tdm_machine_container');
            const serialContainer = document.getElementById('tdm_serial_container');
            const totalPriceContainer = document.getElementById('tdm_total_price_container');
            const headerRow = document.getElementById('tdmTableHeaderRow');

            const formatDateTimeThai = (dateStr) => {
                return window.formatDateTimeThai ? window.formatDateTimeThai(dateStr) : dateStr;
            };

            document.getElementById('tdm_date').innerText = formatDateTimeThai(t.date || t.created_at || '');
            document.getElementById('tdm_requester').innerText = t.requester;
            document.getElementById('tdm_department').innerText = t.department;
            document.getElementById('tdm_note').innerText = t.note || "ไม่มีบันทึกข้อมูลเพิ่มเติม";

            if (isRestock) {
                document.getElementById('tdm_id_subtitle').innerText = (t.machine_id === 'PO_RECEIVE' ? "เลขที่ใบรับเข้า (PO): " : "เลขที่ใบรับเข้า (Manual): ") + t.id;
                if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-boxes-stacked text-emerald-500 mr-2"></i>ใบรับเข้าสินค้า';
                if (statusLabelEl) statusLabelEl.innerText = "สถานะการรับเข้า:";
                if (requesterLabelEl) requesterLabelEl.innerText = "พนักงานผู้ทำรายการ:";
                if (departmentLabelEl) departmentLabelEl.innerText = "สังกัดฝ่าย/แผนก:";
                
                let poNum = "";
                if (t.note && t.note.startsWith("รับสินค้าจาก PO ")) {
                    poNum = t.note.replace("รับสินค้าจาก PO ", "").trim();
                } else if (t.note && t.note.startsWith("รับสินค้าfrom PO ")) {
                    poNum = t.note.replace("รับสินค้าfrom PO ", "").trim();
                }

                const po = poNum ? (db.purchaseOrders ? db.purchaseOrders.find(o => String(o.poNumber).trim() === poNum) : null) : null;
                
                if (machineLabelEl) machineLabelEl.innerText = "เลขที่ PO:";
                document.getElementById('tdm_machine').innerText = poNum || "-";
                
                if (serialLabelEl) serialLabelEl.innerText = "เลขที่ PR:";
                document.getElementById('tdm_serial_number').innerText = (po && po.prNumber) ? po.prNumber : "-";
                
                if (machineContainer) machineContainer.classList.remove('hidden');
                if (serialContainer) serialContainer.classList.remove('hidden');
                if (totalPriceContainer) totalPriceContainer.classList.add('hidden');
                
                const statusEl = document.getElementById('tdm_status');
                if (statusEl) {
                    statusEl.className = "text-emerald-600 font-extrabold text-sm";
                    statusEl.innerHTML = '<i class="fa-solid fa-circle-check mr-1"></i> รับเข้าคลังสำเร็จ';
                }
                document.getElementById('tdmCancelBtn').classList.add('hidden');
                const printBtn = document.getElementById('tdmPrintBtn');
                if (printBtn) {
                    printBtn.classList.remove('hidden');
                    printBtn.innerHTML = '<i class="fa-solid fa-print"></i> พิมพ์ใบรับเข้าสินค้า';
                    printBtn.onclick = () => printPOSSlip(t);
                }
                
                if (headerRow) {
                    headerRow.innerHTML = `
                        <th class="p-3 font-medium">รหัสสินค้า</th>
                        <th class="p-3 font-medium">ชื่อรายการสินค้า</th>
                        <th class="p-3 font-medium text-right">จำนวนที่สั่งซื้อ</th>
                        <th class="p-3 font-medium text-right">จำนวนที่นับ</th>
                        <th class="p-3 font-medium text-right">จำนวนค้างรับ</th>
                    `;
                }
            } else {
                document.getElementById('tdm_id_subtitle').innerText = (isCancelled ? "เลขที่ใบเบิก (ยกเลิก): " : "เลขที่ใบเบิก: ") + t.id;
                if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-receipt text-blue-500 mr-2"></i>รายละเอียดใบเบิกจ่าย';
                if (statusLabelEl) statusLabelEl.innerText = "สถานะใบเบิก:";
                if (requesterLabelEl) requesterLabelEl.innerText = "พนักงานผู้ขอเบิก:";
                if (departmentLabelEl) departmentLabelEl.innerText = "สังกัดฝ่าย/แผนก:";
                
                const machine = t.machine_id ? db.machines.find(m => m.id == t.machine_id) : null;
                const machineText = machine ? (t.machine_id + " : " + machine.name) : (t.machine_id || "ไม่ระบุเครื่องจักร");
                
                if (machineLabelEl) machineLabelEl.innerText = "ใช้งานสำหรับเครื่องจักร:";
                document.getElementById('tdm_machine').innerText = machineText;
                
                if (serialLabelEl) serialLabelEl.innerText = "Serial Number:";
                document.getElementById('tdm_serial_number').innerText = t.serial_number || "ไม่ระบุ";
                
                if (machineContainer) machineContainer.classList.remove('hidden');
                if (serialContainer) serialContainer.classList.remove('hidden');
                if (totalPriceContainer) totalPriceContainer.classList.remove('hidden');
                
                const statusEl = document.getElementById('tdm_status');
                if (statusEl) {
                    if (isCancelled) {
                        statusEl.className = "text-red-600 font-extrabold text-sm";
                        statusEl.innerHTML = '<i class="fa-solid fa-circle-xmark mr-1"></i> ยกเลิกใบเบิก (คืนสต็อกแล้ว)';
                        document.getElementById('tdmCancelBtn').classList.add('hidden');
                    } else {
                        statusEl.className = "text-green-600 font-extrabold text-sm";
                        statusEl.innerHTML = '<i class="fa-solid fa-circle-check mr-1"></i> ทำรายการสำเร็จ';
                        
                        if (isLoggedIn) {
                            const canCancel = isLoggedIn && (currentUser.role === 'ADMIN' || currentUser.role === 'Manager');
                            if (canCancel) {
                                document.getElementById('tdmCancelBtn').classList.remove('hidden');
                                document.getElementById('tdmCancelBtn').onclick = () => requestCancelTransaction(t.id);
                            } else {
                                document.getElementById('tdmCancelBtn').classList.add('hidden');
                            }
                        } else {
                            document.getElementById('tdmCancelBtn').classList.add('hidden');
                        }
                    }
                }
                
                const printBtn = document.getElementById('tdmPrintBtn');
                if (printBtn) {
                    printBtn.classList.remove('hidden');
                    printBtn.innerHTML = '<i class="fa-solid fa-print"></i> พิมพ์ใบเบิกอะไหล่';
                    printBtn.onclick = () => printPOSSlip(t);
                }

                if (headerRow) {
                    headerRow.innerHTML = `
                        <th class="p-3 font-medium">รหัสอะไหล่</th>
                        <th class="p-3 font-medium">ชื่อรายการสินค้า</th>
                        <th class="p-3 font-medium text-right">จำนวนเบิก</th>
                        <th class="p-3 font-medium text-right">ราคาต่อหน่วย</th>
                        <th class="p-3 font-medium text-right">ยอดรวม</th>
                    `;
                }
            }
            
            // Toggle Delete Button for ADMIN
            const deleteBtn = document.getElementById('tdmDeleteBtn');
            if (deleteBtn) {
                if (isLoggedIn && currentUser.role === 'ADMIN') {
                    deleteBtn.classList.remove('hidden');
                    deleteBtn.onclick = () => requestDeleteTransaction(t.id);
                } else {
                    deleteBtn.classList.add('hidden');
                }
            }
            
            // Render items list inside slip detail
            const itemsTbody = document.getElementById('tdmItemsTableBody');
            itemsTbody.innerHTML = '';
            
            t.items.forEach(item => {
                const prod = db.products ? db.products.find(p => String(p.id).trim().toLowerCase() === String(item.product_id).trim().toLowerCase()) : null;
                const prodName = prod ? prod.name : 'ไม่พบชื่อสินค้า';
                const unit = prod ? (prod.unit || 'ชิ้น') : 'ชิ้น';

                if (isRestock) {
                    let poNum = "";
                    if (t.note && t.note.startsWith("รับสินค้าจาก PO ")) {
                        poNum = t.note.replace("รับสินค้าจาก PO ", "").trim();
                    } else if (t.note && t.note.startsWith("รับสินค้าfrom PO ")) {
                        poNum = t.note.replace("รับสินค้าfrom PO ", "").trim();
                    }

                    const po = poNum ? (db.purchaseOrders ? db.purchaseOrders.find(o => String(o.poNumber).trim() === poNum) : null) : null;
                    
                    let orderedQty = '-';
                    let pendingQty = '-';
                    if (t.machine_id === 'PO_RECEIVE' && po) {
                        orderedQty = `${po.orderedQty} ${unit}`;
                        const calculatedPending = Math.max(0, (parseFloat(po.orderedQty) || 0) - (parseFloat(po.receivedQty) || 0));
                        pendingQty = `${calculatedPending} ${unit}`;
                    } else if (t.machine_id === 'PO_RECEIVE') {
                        orderedQty = '-';
                        pendingQty = '-';
                    } else {
                        orderedQty = '-';
                        pendingQty = '0 ' + unit;
                    }

                    let tr = `
                        <tr class="hover:bg-slate-50 border-b border-gray-150 last:border-0">
                            <td class="p-3 font-mono font-bold text-gray-800">${escapeHTML(item.product_id)}</td>
                            <td class="p-3 text-gray-600 text-xs">${escapeHTML(prodName)}</td>
                            <td class="p-3 text-right text-gray-600">${orderedQty}</td>
                            <td class="p-3 text-right font-bold text-gray-800">${item.qty} ${unit}</td>
                            <td class="p-3 text-right font-bold text-rose-600">${pendingQty}</td>
                        </tr>
                    `;
                    itemsTbody.insertAdjacentHTML('beforeend', tr);
                } else {
                    const subtotal = item.qty * item.price;
                    const priceStr = `฿${item.price.toLocaleString('th-TH', {minimumFractionDigits: 2})}`;
                    const subtotalStr = `฿${subtotal.toLocaleString('th-TH', {minimumFractionDigits: 2})}`;
                    let tr = `
                        <tr class="hover:bg-slate-50 border-b border-gray-150 last:border-0">
                            <td class="p-3 font-mono font-bold text-gray-800">${escapeHTML(item.product_id)}</td>
                            <td class="p-3 text-gray-600 text-xs">${escapeHTML(prodName)}</td>
                            <td class="p-3 text-right font-bold text-gray-800">${item.qty} ${unit}</td>
                            <td class="p-3 text-right text-gray-500">${priceStr}</td>
                            <td class="p-3 text-right font-bold text-blue-600">${subtotalStr}</td>
                        </tr>
                    `;
                    itemsTbody.insertAdjacentHTML('beforeend', tr);
                }
            });
            
            document.getElementById('tdm_total_price').innerText = isRestock ? '-' : '฿' + t.total_price.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            
            document.getElementById('transactionDetailModal').classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }

        function closeTransactionDetailModal() {
            document.getElementById('transactionDetailModal').classList.add('hidden');
            document.body.style.overflow = '';
        }

        function requestCancelTransaction(txId) {
            confirmAction(`ยืนยันการยกเลิกใบเบิกเลขที่ "${txId}"?\nการยกเลิกใบเบิกจะทำการบวกจำนวนอะไหล่คืนเข้าคลังคงเดิมโดยอัตโนมัติ`, async () => {
                showLoading('กำลังยกเลิกรายการเบิกจ่าย...');
                try {
                    let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'cancelTransaction', payload: { transaction_id: txId } }) });
                    let result = await res.json();
                    
                    if (result.status === 'success') {
                        closeTransactionDetailModal();
                        showToast('ยกเลิกรายการและคืนยอดคลังสำเร็จ');
                        await fetchData(false);
                        await loadTransactions();
                    } else {
                        showToast('เกิดข้อผิดพลาด: ' + result.message, 'error');
                    }
                } catch (err) {
                    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย', 'error');
                }
                hideLoading();
            });
        }

        function requestDeleteTransaction(txId) {
            confirmAction(`⚠️ ยืนยันการลบใบเบิกเลขที่ "${txId}" ใช่หรือไม่?\nการลบนี้จะนำประวัติออกจากระบบอย่างถาวรและจะไม่มีการคืนสต็อกสินค้าคืนกลับเข้าคลัง!`, async () => {
                showLoading('กำลังลบประวัติใบเบิก...');
                try {
                    let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteTransaction', payload: { transaction_id: txId } }) });
                    let result = await res.json();
                    
                    if (result.status === 'success') {
                        closeTransactionDetailModal();
                        showToast('ลบรายการประวัติใบเบิกเรียบร้อยแล้ว', 'success');
                        await fetchData(false);
                        await loadTransactions();
                    } else {
                        showToast('ลบรายการไม่สำเร็จ: ' + result.message, 'error');
                    }
                } catch (err) {
                    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย', 'error');
                }
                hideLoading();
            });
        }

        function printPOSSlip(t) {
            const printWindow = window.open('', '_blank', 'width=900,height=700');
            if (!printWindow) { showToast('กรุณาอนุญาต popup ในเบราว์เซอร์ก่อน', 'error'); return; }
            const doc = printWindow.document;

            const isRestock = t.status === 'Restock';
            const logoUrl = 'https://lh3.googleusercontent.com/d/1kH8HErbms_U0xnoiJ7jlW7r79FK3hXeB'; // โลโก้
            const companyNameTh = 'บริษัท พีรพัฒน์ เทคโนโลยี จำกัด (มหาชน) สำนักงานใหญ่';
            const companyNameEn = 'PEERAPAT TECHNOLOGY PUBLIC COMPANY LIMITED';
            const companyAddressTh = '406 ถ.รัชดาภิเษก แขวงสามเสนนอก เขตห้วยขวาง กรุงเทพ 10310';
            const companyAddressEn = '406 Ratchadapisek Rd., Samsen Nork, Huaykwang, Bangkok 10310';
            const companyContact = 'Tel. 02-290-1200 Fax: 02-290-1249';
            const companyWebsite = 'Web site: https://www.peerapat.com';
            const companyTaxId = 'เลขประจำตัวผู้เสียภาษี 0107551000231';

            const formatDateTimeThai = (dateStr) => {
                return window.formatDateTimeThai ? window.formatDateTimeThai(dateStr) : dateStr;
            };

            const formattedDate = formatDateTimeThai(t.date || t.created_at || '');

            let poNum = "";
            if (isRestock) {
                if (t.note && t.note.startsWith("รับสินค้าจาก PO ")) {
                    poNum = t.note.replace("รับสินค้าจาก PO ", "").trim();
                } else if (t.note && t.note.startsWith("รับสินค้าfrom PO ")) {
                    poNum = t.note.replace("รับสินค้าfrom PO ", "").trim();
                }
            }
            const po = poNum ? (db.purchaseOrders ? db.purchaseOrders.find(o => String(o.poNumber).trim() === poNum) : null) : null;

            const docTitle = isRestock ? 'ใบรับเข้าสินค้า' : 'ใบเบิกอะไหล่';
            const operatorLabel = isRestock ? 'พนักงานผู้ทำรายการ:' : 'ผู้เบิก:';

            let totalQty = 0;
            let itemsRows = '';
            let tableHeaderHtml = '';
            let rowNum = 1;

            if (isRestock) {
                tableHeaderHtml = '<tr>'
                    + '<th style="padding:8px 10px;font-size:12px;font-weight:600;text-align:left;">รหัสสินค้า<\/th>'
                    + '<th style="padding:8px 10px;font-size:12px;font-weight:600;text-align:left;">ชื่อรายการสินค้า<\/th>'
                    + '<th style="padding:8px 10px;font-size:12px;font-weight:600;text-align:right;width:100px;">จำนวนสั่งซื้อ<\/th>'
                    + '<th style="padding:8px 10px;font-size:12px;font-weight:600;text-align:right;width:100px;">จำนวนที่รับ<\/th>'
                    + '<th style="padding:8px 10px;font-size:12px;font-weight:600;text-align:right;width:100px;">จำนวนค้างรับ<\/th>'
                    + '<\/tr>';

                t.items.forEach(function(item) {
                    const prod = db.products ? db.products.find(p => String(p.id).trim().toLowerCase() === String(item.product_id).trim().toLowerCase()) : null;
                    const prodName = prod ? prod.name : 'ไม่ระบุชื่อสินค้า';
                    const unit = (prod && prod.unit) ? prod.unit : 'ชิ้น';
                    totalQty += item.qty;

                    let orderedQty = '-';
                    let pendingQty = '-';
                    if (t.machine_id === 'PO_RECEIVE' && po) {
                        orderedQty = po.orderedQty + ' ' + unit;
                        const calculatedPending = Math.max(0, (parseFloat(po.orderedQty) || 0) - (parseFloat(po.receivedQty) || 0));
                        pendingQty = calculatedPending + ' ' + unit;
                    } else if (t.machine_id === 'PO_RECEIVE') {
                        orderedQty = '-';
                        pendingQty = '-';
                    } else {
                        orderedQty = '-';
                        pendingQty = '0 ' + unit;
                    }

                    itemsRows += '<tr>'
                        + '<td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;font-size:12px;font-family:monospace;font-weight:bold;">' + item.product_id + '<\/td>'
                        + '<td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;font-size:12px;">' + prodName + '<\/td>'
                        + '<td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:right;font-size:12px;">' + orderedQty + '<\/td>'
                        + '<td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:right;font-size:12px;font-weight:bold;color:#059669;">' + item.qty + ' ' + unit + '<\/td>'
                        + '<td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:right;font-size:12px;font-weight:bold;color:#e11d48;">' + pendingQty + '<\/td>'
                        + '<\/tr>';
                });
            } else {
                tableHeaderHtml = '<tr>'
                    + '<th style="padding:8px 10px;font-size:12px;font-weight:600;text-align:left;">รายการ<\/th>'
                    + '<th style="padding:8px 10px;font-size:12px;font-weight:600;text-align:right;width:80px;">จำนวน<\/th>'
                    + '<th style="padding:8px 10px;font-size:12px;font-weight:600;text-align:right;width:70px;">หน่วย<\/th>'
                    + '<\/tr>';

                t.items.forEach(function(item) {
                    const prod = db.products.find(p => p.id == item.product_id);
                    const prodName = prod ? prod.name : 'ไม่ระบุชื่อสินค้า';
                    const unit = (prod && prod.unit) ? prod.unit : 'UNIT';
                    totalQty += item.qty;
                    itemsRows += '<tr>'
                        + '<td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;font-size:12px;">' + rowNum++ + '. ' + prodName + '<br><span style="font-size:10px;color:#888;">' + item.product_id + '<\/span><\/td>'
                        + '<td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:right;font-size:13px;font-weight:bold;">' + item.qty + '<\/td>'
                        + '<td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:right;font-size:12px;">' + unit + '<\/td>'
                        + '<\/tr>';
                });
            }

            let metaLeftHtml = '';
            let metaRightHtml = '';

            if (isRestock) {
                metaLeftHtml = '<div class="meta-row"><span class="meta-label">เลขที่ใบรับเข้า:<\/span> ' + t.id + '<\/div>'
                    + '<div class="meta-row"><span class="meta-label">วันที่ทำรายการ:<\/span> ' + formattedDate + '<\/div>'
                    + '<div class="meta-row"><span class="meta-label">เลขที่ PO:<\/span> ' + (poNum || '-') + '<\/div>'
                    + '<div class="meta-row"><span class="meta-label">เลขที่ PR:<\/span> ' + ((po && po.prNumber) ? po.prNumber : '-') + '<\/div>';

                metaRightHtml = '<div class="meta-row"><span class="meta-label">' + operatorLabel + '<\/span> ' + (t.requester || '-') + '<\/div>'
                    + '<div class="meta-row"><span class="meta-label">สังกัดฝ่าย/แผนก:<\/span> ' + (t.department || '-') + '<\/div>';
            } else {
                const machine = t.machine_id ? db.machines.find(m => m.id == t.machine_id) : null;
                const machineText = machine ? (t.machine_id + " : " + machine.name) : (t.machine_id || "-");
                
                metaLeftHtml = '<div class="meta-row"><span class="meta-label">เลขที่ใบเบิก:<\/span> ' + t.id + '<\/div>'
                    + '<div class="meta-row"><span class="meta-label">วันที่:<\/span> ' + formattedDate + '<\/div>'
                    + '<div class="meta-row"><span class="meta-label">เครื่องจักร:<\/span> ' + machineText + '<\/div>';

                metaRightHtml = '<div class="meta-row"><span class="meta-label">' + operatorLabel + '<\/span> ' + (t.requester || '-') + '<\/div>'
                    + '<div class="meta-row"><span class="meta-label">แผนก:<\/span> ' + (t.department || '-') + '<\/div>'
                    + '<div class="meta-row"><span class="meta-label">Serial Number:<\/span> ' + (t.serial_number || '-') + '<\/div>';
            }

            const css = '* { margin:0; padding:0; box-sizing:border-box; }'
                + '@page { size:A4 portrait; margin: 5mm; }'
                + 'body { font-family:Sarabun,sans-serif; font-size:13px; color:#222; background:#fff; }'
                + '.page-wrapper { width:100%; display:flex; flex-direction:column; min-height:calc(297mm - 10mm); }'
                + '.content-grow { flex-grow:1; }'
                + '.doc-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px; }'
                + '.logo-block { flex:0 0 130px; text-align:left; }'
                + '.logo-block img { max-width:120px; max-height:60px; object-fit:contain; }'
                + '.company-block { flex:1; text-align:center; padding:0 20px; }'
                + '.company-name-th { font-size:14px; font-weight:700; }'
                + '.company-name-en { font-size:11px; font-weight:600; color:#444; margin-top:2px; }'
                + '.company-address { font-size:10px; color:#555; line-height:1.5; margin-top:4px; }'
                + '.company-contact { font-size:10px; color:#555; margin-top:4px; }'
                + '.doc-title-bar { text-align:center; font-size:14px; font-weight:700; border-top:1.5px solid #222; border-bottom:1.5px solid #222; padding:5px 0; margin:8px 0 12px 0; }'
                + '.meta-grid { display:flex; justify-content:space-between; margin-bottom:10px; font-size:12px; }'
                + '.meta-right { text-align:right; }'
                + '.meta-row { margin-bottom:2px; }'
                + '.meta-label { font-weight:600; }'
                + '.purpose-bar { background:#f5f5f5; border:1px solid #ddd; border-radius:4px; padding:6px 10px; font-size:12px; margin-bottom:14px; }'
                + '.items-table { width:100%; border-collapse:collapse; margin-bottom:16px; }'
                + '.items-table thead tr { background:#222; color:#fff; }'
                + '.items-table thead th { padding:8px 10px; font-size:12px; font-weight:600; text-align:left; }'
                + '.items-table tbody tr:nth-child(even) { background:#fafafa; }'
                + '.items-table tbody td { padding:6px 8px; font-size:12px; border-bottom:1px solid #eee; }'
                + '.total-row { display:flex; justify-content:flex-end; margin-bottom:6px; font-size:13px; }'
                + '.total-row .label { font-weight:600; margin-right:20px; }'
                + '.total-row .value { font-weight:700; min-width:80px; text-align:right; }'
                + '.watermark { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); opacity:0.05; pointer-events:none; width:420px; }'
                + '.sig-zone { display:flex; justify-content:space-between; margin-top:20px; padding:0 10px; }'
                + '.sig-col { text-align:center; width:200px; }'
                + '.sig-line { border-top:1px solid #333; padding-top:6px; font-size:11px; color:#444; margin-top:50px; }'
                + '.sig-name { font-size:11px; color:#666; margin-top:2px; }'
                + '.doc-footer { margin-top:40px; padding-top:12px; border-top:1px dashed #ccc; font-size:9px; color:#aaa; text-align:center; }'
                + '.print-toolbar { display:flex; justify-content:flex-end; padding:10px 0; }'
                + '.print-toolbar button { padding:8px 20px; background:#1d4ed8; color:#fff; border:none; border-radius:8px; font-size:14px; font-weight:700; cursor:pointer; }'
                + '@media print { .print-toolbar { display:none; } .watermark { position:fixed; } }';

            const html = '<!DOCTYPE html>'
                + '<html lang="th"><head><meta charset="UTF-8">'
                + '<title>' + docTitle + ' - ' + t.id + '<\/title>'
                + '<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">'
                + '<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>'
                + '<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>'
                + '<style>' + css + '<\/style>'
                + '<\/head><body>'
                + '<\/head><body onload="window.print()">'
                + '<img class="watermark" src="' + logoUrl + '" alt="">'
                + '<div class="print-toolbar">'
                + '<button onclick="exportPDF()" style="margin-right:10px;background:#16a34a;">&#128196; บันทึกเป็น PDF<\/button>'
                + '<button onclick="window.print()">&#128424; พิมพ์' + docTitle + '<\/button>'
                + '<\/div>'
                + '<script>'
                + 'async function exportPDF(){'
                + ' try{'
                + '  var btns=document.querySelectorAll(".print-toolbar button");'
                + '  btns.forEach(function(b){b.disabled=true;b.style.opacity="0.5";});'
                + '  var el=document.getElementById("print-body");'
                + '  var canvas=await html2canvas(el,{scale:2,useCORS:true,allowTaint:true,logging:false});'
                + '  var imgData=canvas.toDataURL("image/jpeg",0.92);'
                + '  var j=window.jspdf.jsPDF;'
                + '  var pdf=new j({orientation:"portrait",unit:"mm",format:"a4"});'
                + '  var pw=pdf.internal.pageSize.getWidth();'
                + '  var ph=pdf.internal.pageSize.getHeight();'
                + '  var imgH=pw*(canvas.height/canvas.width);'
                + '  if(imgH<=ph){pdf.addImage(imgData,"JPEG",0,0,pw,imgH);}'
                + '  else{'
                + '   var pp=Math.floor(canvas.width*(ph/pw));'
                + '   var y=0;'
                + '   while(y<canvas.height){'
                + '    var sc=document.createElement("canvas");'
                + '    var sh=Math.min(pp,canvas.height-y);'
                + '    sc.width=canvas.width;sc.height=sh;'
                + '    sc.getContext("2d").drawImage(canvas,0,y,canvas.width,sh,0,0,canvas.width,sh);'
                + '    if(y>0)pdf.addPage();'
                + '    pdf.addImage(sc.toDataURL("image/jpeg",0.92),"JPEG",0,0,pw,pw*(sh/canvas.width));'
                + '    y+=sh;'
                + '   }'
                + '  }'
                + '  pdf.save("' + docTitle + '-' + t.id + '.pdf");'
                + ' }catch(e){alert("เกิดข้อผิดพลาด: "+e.message);}'
                + ' var b2=document.querySelectorAll(".print-toolbar button");'
                + ' b2.forEach(function(b){b.disabled=false;b.style.opacity="1";});'
                + '}'
                + '<\/script>'
                + '<div id="print-body"><div class="page-wrapper">'
                + '<div class="content-grow">'
                + '<div class="doc-header">'
                + '<div class="logo-block"><img src="' + logoUrl + '" alt="Logo" onerror="this.style.display=\'none\'"><\/div>'
                + '<div class="company-block">'
                + '<div class="company-name-th">' + companyNameTh + '<\/div>'
                + '<div class="company-name-en">' + companyNameEn + '<\/div>'
                + '<div class="company-address">'
                + '<div>' + companyAddressTh + '<\/div>'
                + '<div>' + companyContact + ' &nbsp;|&nbsp; ' + companyWebsite + ' &nbsp;|&nbsp; ' + companyTaxId + '<\/div>'
                + '<\/div>'
                + '<\/div>'
                + '<div style="flex:0 0 130px;"><\/div>'
                + '<\/div>'
                + '<div class="doc-title-bar">' + docTitle + '<\/div>'
                + '<div class="meta-grid">'
                + '<div class="meta-left">' + metaLeftHtml + '<\/div>'
                + '<div class="meta-right">' + metaRightHtml + '<\/div>'
                + '<\/div>'
                + '<div class="purpose-bar"><span class="meta-label">' + (isRestock ? "หมายเหตุการรับเข้า:" : "วัตถุประสงค์การเบิก:") + '<\/span> ' + (t.note || '-') + '<\/div>'
                + '<table class="items-table">'
                + '<thead>' + tableHeaderHtml + '<\/thead>'
                + '<tbody>' + itemsRows + '<\/tbody>'
                + '<\/table>'
                + '<\/div>'
                + '<div class="sig-zone">'
                + '<div class="sig-col"><div class="sig-line">ลงชื่อ ...............................<\/div><div class="sig-name">' + (isRestock ? "(ผู้ทำรายการรับเข้า)" : "(ผู้ขอ/จ่ายของสโตร์)") + '<\/div><\/div>'
                + '<div class="sig-col"><div class="sig-line">ลงชื่อ ...............................<\/div><div class="sig-name">' + (isRestock ? "(ผู้ส่งมอบ/ผู้ตรวจสอบ)" : "(ผู้รับมอบ)") + '<\/div><div class="sig-name">ผู้บันทึก<\/div><\/div>'
                + '<\/div>'
                + '<\/div>'
                + '<\/div>'
                + '<\/body><\/html>';

            doc.open();
            doc.write(html);
            doc.close();
        }



// ===== Modular Helper Functions for Requisition =====

function updateAllViews() {
    if (db && Array.isArray(db.products)) {
        db.products.sort((a, b) => {
            const aCancelled = a.note && (a.note.trim() === 'ยกเลิกใช้' || a.note.includes('ยกเลิกใช้'));
            const bCancelled = b.note && (b.note.trim() === 'ยกเลิกใช้' || b.note.includes('ยกเลิกใช้'));
            if (aCancelled && !bCancelled) return 1;
            if (!aCancelled && bCancelled) return -1;
            return 0;
        });
    }

    if (typeof renderPOSGrid === 'function') renderPOSGrid();
    if (typeof loadTransactions === 'function') loadTransactions();
    if (typeof populateDatalists === 'function') populateDatalists();
    if (typeof updatePurchaseBadgeCounts === 'function') updatePurchaseBadgeCounts();
}

function updatePurchaseBadgeCounts() {
    if (!db || !Array.isArray(db.purchaseOrders)) return;

    const receivePendingCount = db.purchaseOrders.filter(o => o.status === "สั่งแล้ว" || o.status === "ค้างส่ง").length;
    const receiveBadge = document.getElementById('count-purchase-receive');
    if (receiveBadge) {
        if (receivePendingCount > 0) {
            receiveBadge.innerText = receivePendingCount;
            receiveBadge.classList.remove('hidden');
        } else {
            receiveBadge.classList.add('hidden');
        }
    }

    const managePendingCount = db.purchaseOrders.filter(o => o.status === "เตรียมสั่ง" || o.status === "รออนุมัติ").length;
    const manageBadge = document.getElementById('count-manage-orders');
    if (manageBadge) {
        if (managePendingCount > 0) {
            manageBadge.innerText = managePendingCount;
            manageBadge.classList.remove('hidden');
        } else {
            manageBadge.classList.add('hidden');
        }
    }
}

function populateDatalists() {
    if (!db) return;
    
    // ประเภทอะไหล่ (Product Categories)
    const productCategories = [...new Set(db.products.map(p => p.category).filter(Boolean))].sort();
    const dlProdCategories = document.getElementById('list_product_categories');
    if (dlProdCategories) {
        dlProdCategories.innerHTML = productCategories.map(c => `<option value="${escapeHTML(c)}">`).join('');
    }
    
    // กลุ่มสินค้า (Product Groups)
    const productGroups = [...new Set(db.products.map(p => p.group).filter(Boolean))].sort();
    const dlProdGroups = document.getElementById('list_product_groups');
    if (dlProdGroups) {
        dlProdGroups.innerHTML = productGroups.map(g => `<option value="${escapeHTML(g)}">`).join('');
    }
}
