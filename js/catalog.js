        // ===== Settings & User Management System =====

        function initSettingsView() {
            if (!isLoggedIn || !currentUser) return;
            
            const cardAdmin = document.getElementById('card-admin-user-mgmt');
            if (cardAdmin) cardAdmin.classList.toggle('hidden', !hasAccess('view-user-management'));
            
            const cardMapping = document.getElementById('card-settings-mapping');
            if (cardMapping) cardMapping.classList.toggle('hidden', !hasAccess('view-mapping'));
            
            const cardEditProducts = document.getElementById('card-settings-edit-products');
            if (cardEditProducts) cardEditProducts.classList.toggle('hidden', !hasAccess('view-edit-products'));
            
            const cardEditMapping = document.getElementById('card-settings-edit-mapping');
            if (cardEditMapping) cardEditMapping.classList.toggle('hidden', !hasAccess('view-edit-mapping'));

            const cardRestockHistory = document.getElementById('card-settings-restock-history');
            if (cardRestockHistory) cardRestockHistory.classList.toggle('hidden', !hasAccess('view-restock-history'));

            const cardManageManuals = document.getElementById('card-settings-manage-manuals');
            if (cardManageManuals) cardManageManuals.classList.toggle('hidden', !hasAccess('view-manage-manuals'));

            const cardMachines = document.getElementById('card-settings-machines');
            if (cardMachines) cardMachines.classList.toggle('hidden', !hasAccess('view-machines'));

            const cardBackup = document.getElementById('card-settings-backup');
            if (cardBackup) {
                const isAdmin = isLoggedIn && currentUser && currentUser.role === 'ADMIN';
                cardBackup.classList.toggle('hidden', !isAdmin);
            }
        }

        async function runManualBackup(type) {
            if (!isLoggedIn || !currentUser || currentUser.role !== 'ADMIN') {
                showToast('คุณไม่มีสิทธิ์เข้าถึงส่วนนี้', 'error');
                return;
            }
            
            const action = type === 'json' ? 'backupFirebaseToDrive' : 'backupFirebaseToSheets';
            const confirmMsg = type === 'json' 
                ? 'คุณต้องการสำรองข้อมูลจาก Firebase บันทึกเป็นไฟล์ JSON ใน Google Drive ใช่หรือไม่?'
                : 'คุณต้องการสำรองข้อมูลจาก Firebase ไปบันทึกทับลงใน Google Sheet ทั้งหมดใช่หรือไม่? (การกระทำนี้จะใช้เวลาสักครู่)';
                
            const result = await Swal.fire({
                title: 'ยืนยันการสำรองข้อมูล',
                text: confirmMsg,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'ยืนยัน',
                cancelButtonText: 'ยกเลิก'
            });
            
            if (result.isConfirmed) {
                showLoading('กำลังสำรองข้อมูล กรุณารอสักครู่...');
                try {
                    const res = await fetch(API_URL, {
                        method: 'POST',
                        body: JSON.stringify({
                            action: action,
                            payload: { requesterEmail: currentUser.email }
                        })
                    });
                    
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    const resData = await res.json();
                    
                    if (resData.status === 'success') {
                        showToast(resData.message || 'สำรองข้อมูลสำเร็จ', 'success');
                    } else {
                        throw new Error(resData.message || 'เกิดข้อผิดพลาดในการสำรองข้อมูล');
                    }
                } catch (error) {
                    showToast('เกิดข้อผิดพลาด: ' + error.message, 'error');
                } finally {
                    hideLoading();
                }
            }
        }

        function openSelfSettingsModal() {
            if (!isLoggedIn || !currentUser) return;
            
            document.getElementById('self_fullName').value = currentUser.fullName || '';
            document.getElementById('self_department').value = currentUser.department || '';
            document.getElementById('self_phone').value = currentUser.phone || '';
            document.getElementById('self_email').value = currentUser.email || '';
            
            document.getElementById('self_password').value = '';
            document.getElementById('self_confirmPassword').value = '';
            
            document.getElementById('selfSettingsModal').classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }

        function closeSelfSettingsModal() {
            document.getElementById('selfSettingsModal').classList.add('hidden');
            document.body.style.overflow = '';
        }

        async function submitSelfSettings(e) {
            e.preventDefault();
            if (!isLoggedIn || !currentUser) return;
            
            const fullName = document.getElementById('self_fullName').value.trim();
            const department = document.getElementById('self_department').value.trim();
            const phone = document.getElementById('self_phone').value.trim();
            const email = document.getElementById('self_email').value.trim();
            const password = document.getElementById('self_password').value;
            const confirmPassword = document.getElementById('self_confirmPassword').value;
            
            if (!fullName || !department || !phone || !email) {
                showToast("กรุณากรอกข้อมูลให้ครบถ้วน", "error");
                return;
            }
            
            if (password) {
                if (password.length < 6) {
                    showToast("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร", "error");
                    return;
                }
                if (password !== confirmPassword) {
                    showToast("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน", "error");
                    return;
                }
            }
            
            showLoading("กำลังบันทึกข้อมูลส่วนตัว...");
            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'updateSelfProfile',
                        payload: {
                            currentEmail: currentUser.email,
                            fullName: fullName,
                            department: department,
                            phone: phone,
                            email: email,
                            password: password
                        }
                    })
                });
                const result = await res.json();
                hideLoading();
                
                if (result.status === 'success') {
                    currentUser = result.data;
                    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                    updateAuthUI();
                    closeSelfSettingsModal();
                    showToast("ปรับปรุงข้อมูลส่วนตัวของคุณเรียบร้อยแล้ว", "success");
                } else {
                    showToast(result.message || "ปรับปรุงข้อมูลล้มเหลว", "error");
                }
            } catch (err) {
                hideLoading();
                console.error(err);
                showToast("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์", "error");
            }
        }

        let allFetchedUsers = [];

        function openUserManagementModal() {
            switchView('view-user-management');
        }

        function closeUserManagementModal() {
            switchView('view-settings');
        }

        async function fetchAndRenderUsersList() {
            const tableBody = document.getElementById('usersListTableBody');
            if (!tableBody) return;
            
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="p-8 text-center text-gray-500">
                        <div class="flex flex-col items-center justify-center gap-2">
                            <div class="small-spinner"></div>
                            <span class="text-xs">กำลังโหลดรายชื่อผู้ใช้...</span>
                        </div>
                    </td>
                </tr>
            `;
            
            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'getUsersList',
                        payload: { requesterEmail: currentUser.email }
                    })
                });
                const result = await res.json();
                
                if (result.status === 'success') {
                    allFetchedUsers = result.data || [];
                    const searchInput = document.getElementById('user_management_search');
                    if (searchInput && searchInput.value.trim()) {
                        filterUsersListTable();
                    } else {
                        renderUsersListTable(allFetchedUsers);
                    }
                } else {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="6" class="p-8 text-center text-red-500 text-xs">ดึงข้อมูลล้มเหลว: ${escapeHTML(result.message)}</td>
                        </tr>
                    `;
                }
            } catch (err) {
                console.error(err);
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="p-8 text-center text-red-500 text-xs">เกิดข้อผิดพลาดในการโหลดข้อมูล</td>
                    </tr>
                `;
            }
        }

        function filterUsersListTable() {
            const searchVal = (document.getElementById('user_management_search')?.value || '').trim().toLowerCase();
            if (!searchVal) {
                renderUsersListTable(allFetchedUsers);
                return;
            }
            const filtered = allFetchedUsers.filter(u => {
                const name = (u.fullName || '').toLowerCase();
                const dept = (u.department || '').toLowerCase();
                const email = (u.email || '').toLowerCase();
                const phone = (u.phone || '').toLowerCase();
                const role = (u.role || '').toLowerCase();
                return name.includes(searchVal) || dept.includes(searchVal) || email.includes(searchVal) || phone.includes(searchVal) || role.includes(searchVal);
            });
            renderUsersListTable(filtered);
        }

        function renderUsersListTable(users) {
            const tableBody = document.getElementById('usersListTableBody');
            if (!tableBody) return;
            
            if (!users || users.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="p-8 text-center text-gray-500 text-xs">ไม่พบผู้ใช้งานในระบบ</td>
                    </tr>
                `;
                return;
            }
            
            tableBody.innerHTML = '';
            users.forEach(u => {
                let roleColor = 'bg-gray-100 text-gray-700';
                if (u.role === 'ADMIN') roleColor = 'bg-red-50 text-red-700 border border-red-150';
                else if (u.role === 'Manager') roleColor = 'bg-amber-50 text-amber-700 border border-amber-150';
                else if (u.role === 'Technician') roleColor = 'bg-purple-50 text-purple-700 border border-purple-150';
                else if (u.role === 'StoreOfficer') roleColor = 'bg-emerald-50 text-emerald-700 border border-emerald-150';
                
                let userTypeBadge = '';
                if (u.role !== 'ADMIN' && u.role !== 'Manager' && u.role !== 'StoreOfficer') {
                    const isOutsource = (u.userType === 'outsource');
                    userTypeBadge = isOutsource
                        ? `<span class="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-200">Outsource (ภายนอก)</span>`
                        : `<span class="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">Insource (ภายใน)</span>`;
                }

                let priceName = 'A (ราคากลาง)';
                if (u.priceLevel === 'B') priceName = 'B (ราคาตัวแทน)';
                else if (u.priceLevel === 'C') priceName = 'C (ราคาในเครือ)';
                else if (u.priceLevel === 'COST') priceName = 'COST (ราคาต้นทุน)';
                
                const isSelf = u.email === currentUser.email;
                const isSystemAdmin = u.email === 'nakyeet@gmail.com';
                
                const actionsHtml = isSystemAdmin
                    ? `<span class="text-[10px] text-gray-400 font-semibold italic">ผู้สร้างระบบ</span>`
                    : `
                        <div class="flex justify-center gap-2">
                            <button onclick="editUserRoleAndPrice('${escapeForJS(u.email)}', '${escapeForJS(u.role)}', '${escapeForJS(u.priceLevel || 'A')}', '${escapeForJS(u.userType || 'insource')}')" class="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition rounded-lg text-xs font-semibold">
                                <i class="fa-solid fa-edit mr-1"></i> แก้ไข
                            </button>
                            ${isSelf ? '' : `
                            <button onclick="deleteUserByAdmin('${escapeForJS(u.email)}')" class="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition rounded-lg text-xs font-semibold">
                                <i class="fa-solid fa-trash-can mr-1"></i> ลบ
                            </button>
                            `}
                        </div>
                    `;

                const rowHtml = `
                    <tr class="hover:bg-slate-50 transition border-b border-gray-100">
                        <td class="px-4 py-3 font-semibold text-slate-800">${escapeHTML(u.fullName)}</td>
                        <td class="px-4 py-3 text-slate-500 text-xs">${escapeHTML(u.department)}</td>
                        <td class="px-4 py-3 text-xs font-mono text-slate-600">
                            <div><i class="fa-solid fa-phone text-slate-400 mr-1"></i>${escapeHTML(u.phone)}</div>
                            <div class="mt-0.5"><i class="fa-solid fa-envelope text-slate-400 mr-1"></i>${escapeHTML(u.email)}</div>
                        </td>
                        <td class="px-4 py-3 text-center">
                            <div class="flex flex-col items-center justify-center">
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${roleColor}">${u.role}</span>
                                ${userTypeBadge}
                            </div>
                        </td>
                        <td class="px-4 py-3 text-center font-bold text-slate-700 text-xs">${priceName}</td>
                        <td class="px-4 py-3 text-center">${actionsHtml}</td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', rowHtml);
            });
        }

        function editUserRoleAndPrice(targetEmail, currentRole, currentPriceLevel, currentUserType) {
            const isNonAdminManager = (currentRole !== 'ADMIN' && currentRole !== 'Manager' && currentRole !== 'StoreOfficer');
            Swal.fire({
                title: 'แก้ไขสิทธิ์และระดับราคาสมาชิก',
                html: `
                    <div class="space-y-4 text-left mt-1 text-xs">
                        <div class="bg-slate-50 p-3 rounded-xl border border-gray-150 flex gap-2.5 items-center mb-3">
                            <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                                <i class="fa-solid fa-user"></i>
                            </div>
                            <div class="min-w-0">
                                <p class="text-[10px] text-gray-400">อีเมลผู้ใช้งาน</p>
                                <p class="font-mono font-bold text-slate-700 truncate">${escapeHTML(targetEmail)}</p>
                            </div>
                        </div>
                        <div>
                            <label class="block font-semibold text-gray-600 mb-1.5">สิทธิ์การใช้งาน (User Role)</label>
                            <select id="swal-edit-role" class="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-800 bg-white cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500">
                                <option value="user" ${currentRole === 'user' ? 'selected' : ''}>user (สมาชิกทั่วไป - POS & Catalog)</option>
                                <option value="Technician" ${currentRole === 'Technician' ? 'selected' : ''}>Technician (ช่างเทคนิค - POS & Catalog)</option>
                                <option value="StoreOfficer" ${currentRole === 'StoreOfficer' ? 'selected' : ''}>Store Officer (เจ้าหน้าที่สโตว์ - แดชบอร์ด & งานจัดซื้อ)</option>
                                <option value="Manager" ${currentRole === 'Manager' ? 'selected' : ''}>Manager (ผู้บริหารจัดการ - คลัง & ประวัติ)</option>
                                <option value="ADMIN" ${currentRole === 'ADMIN' ? 'selected' : ''}>ADMIN (ผู้ดูแลระบบสูงสุด)</option>
                            </select>
                        </div>
                        <div id="swal-user-type-box" class="${isNonAdminManager ? '' : 'hidden'}">
                            <label class="block font-semibold text-gray-600 mb-1.5">ประเภทบุคคล (Personnel Type)</label>
                            <select id="swal-edit-user-type" class="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-800 bg-white cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500">
                                <option value="insource" ${(currentUserType || 'insource') === 'insource' ? 'selected' : ''}>Insource (บุคลากรภายใน)</option>
                                <option value="outsource" ${(currentUserType || 'insource') === 'outsource' ? 'selected' : ''}>Outsource (บุคลากรภายนอก)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block font-semibold text-gray-600 mb-1.5">ระดับราคาสินค้าที่ได้รับ (Price Tier)</label>
                            <select id="swal-edit-price" class="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-800 bg-white cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500">
                                <option value="A" ${currentPriceLevel === 'A' ? 'selected' : ''}>ระดับ A (ราคากลาง / Standard)</option>
                                <option value="B" ${currentPriceLevel === 'B' ? 'selected' : ''}>ระดับ B (ราคาตัวแทน / Agent)</option>
                                <option value="C" ${currentPriceLevel === 'C' ? 'selected' : ''}>ระดับ C (ราคาในเครือ / Affiliate)</option>
                                <option value="COST" ${currentPriceLevel === 'COST' ? 'selected' : ''}>ระดับ COST (ราคาต้นทุน / Cost)</option>
                            </select>
                        </div>
                    </div>
                `,
                confirmButtonText: 'บันทึกการแก้ไข',
                confirmButtonColor: '#10b981',
                showCancelButton: true,
                cancelButtonText: 'ยกเลิก',
                cancelButtonColor: '#6b7280',
                reverseButtons: true,
                customClass: {
                    popup: 'rounded-2xl',
                    confirmButton: 'rounded-xl font-semibold !text-xs',
                    cancelButton: 'rounded-xl font-semibold !text-xs',
                },
                didOpen: () => {
                    const roleSelect = document.getElementById('swal-edit-role');
                    const typeBox = document.getElementById('swal-user-type-box');
                    if (roleSelect && typeBox) {
                        roleSelect.addEventListener('change', () => {
                            const selected = roleSelect.value;
                            if (selected === 'ADMIN' || selected === 'Manager' || selected === 'StoreOfficer') {
                                typeBox.classList.add('hidden');
                            } else {
                                typeBox.classList.remove('hidden');
                            }
                        });
                    }
                },
                preConfirm: () => {
                    const newRole = document.getElementById('swal-edit-role').value;
                    const newPrice = document.getElementById('swal-edit-price').value;
                    const typeSelect = document.getElementById('swal-edit-user-type');
                    const newUserType = (newRole === 'ADMIN' || newRole === 'Manager' || newRole === 'StoreOfficer')
                        ? 'insource'
                        : (typeSelect ? typeSelect.value : 'insource');
                    return { newRole, newPrice, newUserType };
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    showLoading("กำลังปรับปรุงข้อมูลสิทธิ์สมาชิก...");
                    try {
                        const res = await fetch(API_URL, {
                            method: 'POST',
                            body: JSON.stringify({
                                action: 'updateUserByAdmin',
                                payload: {
                                    requesterEmail: currentUser.email,
                                    targetEmail: targetEmail,
                                    newRole: result.value.newRole,
                                    newPriceLevel: result.value.newPrice,
                                    newUserType: result.value.newUserType
                                }
                            })
                        });
                        const resData = await res.json();
                        hideLoading();
                        
                        if (resData.status === 'success') {
                            showToast("แก้ไขข้อมูลผู้ใช้สำเร็จ", "success");
                            fetchAndRenderUsersList();
                        } else {
                            showToast(resData.message || "ล้มเหลว", "error");
                        }
                    } catch (err) {
                        hideLoading();
                        console.error(err);
                        showToast("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์", "error");
                    }
                }
            });
        }

        function deleteUserByAdmin(targetEmail) {
            confirmAction(`คุณต้องการลบผู้ใช้งาน "${targetEmail}" ออกจากระบบใช่หรือไม่?\nการดำเนินการนี้ไม่สามารถย้อนคืนได้`, async () => {
                showLoading("กำลังลบผู้ใช้งาน...");
                try {
                    const res = await fetch(API_URL, {
                        method: 'POST',
                        body: JSON.stringify({
                            action: 'deleteUserByAdmin',
                            payload: {
                                requesterEmail: currentUser.email,
                                targetEmail: targetEmail
                            }
                        })
                    });
                    const resData = await res.json();
                    hideLoading();
                    
                    if (resData.status === 'success') {
                        showToast("ลบผู้ใช้สำเร็จ", "success");
                        fetchAndRenderUsersList();
                    } else {
                        showToast(resData.message || "ล้มเหลว", "error");
                    }
                } catch (err) {
                    hideLoading();
                    console.error(err);
                    showToast("เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว", "error");
                }
            });
        }

        function closeConfirmModal() { Swal.close(); }

        async function initDatabase() {
            showLoading('กำลังตรวจสอบโครงสร้างฐานข้อมูล...');
            try {
                let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'initDatabase' }) });
                let result = await res.json();
                showToast(result.message, result.status);
            } catch (error) { showToast('การเชื่อมต่อล้มเหลว', 'error'); }
            hideLoading();
        }


        function updateAllViews() {
            // แก้ไขข้อมูลสถานะ "ร่าง" เก่าให้เป็น "เตรียมสั่ง" เพื่อแสดงผลใน UI
            if (db && Array.isArray(db.purchaseOrders)) {
                db.purchaseOrders.forEach(o => {
                    if (o && o.status === "ร่าง") {
                        o.status = "เตรียมสั่ง";
                    }
                });
            }

            // จัดเรียงรายการยกเลิกใช้ไปไว้ด้านล่างสุด
            if (db && Array.isArray(db.products)) {
                db.products.sort((a, b) => {
                    const aCancelled = a.note && (a.note.trim() === 'ยกเลิกใช้' || a.note.includes('ยกเลิกใช้'));
                    const bCancelled = b.note && (b.note.trim() === 'ยกเลิกใช้' || b.note.includes('ยกเลิกใช้'));
                    if (aCancelled && !bCancelled) return 1;
                    if (!aCancelled && bCancelled) return -1;
                    return 0;
                });
            }
            if (db && Array.isArray(db.machines)) {
                db.machines.sort((a, b) => {
                    const aCancelled = a.note && (a.note.trim() === 'ยกเลิกใช้' || a.note.includes('ยกเลิกใช้'));
                    const bCancelled = b.note && (b.note.trim() === 'ยกเลิกใช้' || b.note.includes('ยกเลิกใช้'));
                    if (aCancelled && !bCancelled) return 1;
                    if (!aCancelled && bCancelled) return -1;
                    return 0;
                });
            }

            // กรองเอาเฉพาะ mapping ที่มีเครื่องจักรและสินค้าอยู่จริงในระบบ ป้องกันข้อมูลไม่ตรงกันหลังการลบ
            if (db && Array.isArray(db.mappings)) {
                const machineIds = new Set(db.machines.map(m => String(m.id).trim()));
                const productIds = new Set(db.products.map(p => String(p.id).trim()));
                db.mappings = db.mappings.filter(m => 
                    machineIds.has(String(m.machine_id).trim()) && 
                    productIds.has(String(m.product_id).trim())
                );
            }
            
            // ซิงค์การตั้งค่าจากเซิร์ฟเวอร์
            if (db && db.settings) {
                isShowPriceBForGuest = db.settings.isShowPriceBForGuest === true;
                isShowPriceCForGuest = db.settings.isShowPriceCForGuest === true;
                
                const toggleB = document.getElementById('showGuestPriceBToggle');
                if (toggleB) toggleB.checked = isShowPriceBForGuest;
                
                const toggleC = document.getElementById('showGuestPriceCToggle');
                if (toggleC) toggleC.checked = isShowPriceCForGuest;
            }

            buildFilters();
            renderCatalog();
            renderMachineTable();
            renderEditProductTable();
            renderRestockTable();
            initMappingView(); 
            renderMappingTable();
            renderPublicManualsTable();
            renderManageManualsTable();
            populateDatalists();
            updatePurchaseBadgeCounts();
        }

        function updatePurchaseBadgeCounts() {
            if (!db || !Array.isArray(db.purchaseOrders)) return;

            // Count for รับสินค้า (Receive Goods) -> status is "สั่งแล้ว" or "ค้างส่ง"
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

            // Count for จัดการคำสั่งซื้อ (Manage Purchase Orders) -> status is "เตรียมสั่ง" or "รออนุมัติ"
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
            
            // 0. ประเภทอะไหล่ (Product Categories)
            const productCategories = [...new Set(db.products.map(p => p.category).filter(Boolean))].sort();
            const dlProdCategories = document.getElementById('list_product_categories');
            if (dlProdCategories) {
                dlProdCategories.innerHTML = productCategories.map(c => `<option value="${escapeHTML(c)}">`).join('');
            }
            
            // 1. กลุ่มสินค้า (Product Groups)
            const productGroups = [...new Set(db.products.map(p => p.group).filter(Boolean))].sort();
            const dlProdGroups = document.getElementById('list_product_groups');
            if (dlProdGroups) {
                dlProdGroups.innerHTML = productGroups.map(g => `<option value="${escapeHTML(g)}">`).join('');
            }
            
            // 2. กลุ่มเครื่องจักร (Machine Groups)
            const machineGroups = [...new Set(db.machines.map(m => m.group).filter(Boolean))].sort();
            const dlMachGroups = document.getElementById('list_machine_groups');
            if (dlMachGroups) {
                dlMachGroups.innerHTML = machineGroups.map(g => `<option value="${escapeHTML(g)}">`).join('');
            }
            
            // 3. ซัพพลายเออร์ (Suppliers)
            const productSuppliers = [...new Set(db.products.map(p => p.supplier).filter(Boolean))].sort();
            const dlProdSuppliers = document.getElementById('list_product_suppliers');
            if (dlProdSuppliers) {
                dlProdSuppliers.innerHTML = productSuppliers.map(s => `<option value="${escapeHTML(s)}">`).join('');
            }
            
            const machineSuppliers = [...new Set(db.machines.map(m => m.supplier).filter(Boolean))].sort();
            const dlMachSuppliers = document.getElementById('list_machine_suppliers');
            if (dlMachSuppliers) {
                dlMachSuppliers.innerHTML = machineSuppliers.map(s => `<option value="${escapeHTML(s)}">`).join('');
            }
            
            // 4. พื้นที่จัดเก็บ (Storage Area)
            const productStorages = [...new Set(db.products.map(p => p.storage).filter(Boolean))].sort();
            const dlProdStorages = document.getElementById('list_product_storages');
            if (dlProdStorages) {
                dlProdStorages.innerHTML = productStorages.map(s => `<option value="${escapeHTML(s)}">`).join('');
            }
            
            const machineStorages = [...new Set(db.machines.map(m => m.storage).filter(Boolean))].sort();
            const dlMachStorages = document.getElementById('list_machine_storages');
            if (dlMachStorages) {
                dlMachStorages.innerHTML = machineStorages.map(s => `<option value="${escapeHTML(s)}">`).join('');
            }
        }

        function buildFilters() {
            const mapCatSelect = document.getElementById('map_category_filter');
            if(mapCatSelect) {
                mapCatSelect.innerHTML = '<option value="all">-- ทุกประเภทอะไหล่ --</option>';
                const categories = [...new Set(db.products.map(p => p.category))].filter(c => c && c.trim() !== '');
                categories.sort();
                categories.forEach(c => mapCatSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`));
            }

            const mapMachSelect = document.getElementById('filterMappingMachine');
            if (mapMachSelect) {
                mapMachSelect.innerHTML = '<option value="all">-- ทุกเครื่องจักร --</option>';
                db.machines.forEach(m => mapMachSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(m.id)}">${escapeHTML(m.id)} : ${escapeHTML(m.name)}</option>`));
            }

            catalogCategories = [...new Set(db.products.map(p => p.category))].filter(c => c && c.trim() !== '');
            catalogCategories.sort();
            catalogMachines = db.machines;
            
            if(!document.getElementById('filterCategory').value) document.getElementById('filterCategory').value = 'all';
            if(!document.getElementById('filterMachine').value) document.getElementById('filterMachine').value = 'all';
        }

        function openCustomSelect(type) {
            const dropdown = document.getElementById('dropdown_filter' + (type === 'category' ? 'Category' : 'Machine'));
            dropdown.classList.remove('hidden');
            renderCustomSelect(type, true);
            setTimeout(() => { document.getElementById('input_filter' + (type === 'category' ? 'Category' : 'Machine')).select(); }, 10);
        }

        function filterCustomSelect(type) {
            const dropdown = document.getElementById('dropdown_filter' + (type === 'category' ? 'Category' : 'Machine'));
            dropdown.classList.remove('hidden');
            renderCustomSelect(type, false);
        }

        function renderCustomSelect(type, forceShowAll = false) {
            const isCat = type === 'category';
            const inputId = isCat ? 'input_filterCategory' : 'input_filterMachine';
            const dropdownId = isCat ? 'dropdown_filterCategory' : 'dropdown_filterMachine';
            
            const keywordString = forceShowAll ? '' : document.getElementById(inputId).value.toLowerCase();
            const keywords = keywordString.split(/\s+/).filter(k => k.length > 0);
            const dropdown = document.getElementById(dropdownId);
            dropdown.innerHTML = '';
            
            let allOptionHtml = `
                <div class="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 transition text-gray-800 font-medium bg-gray-50" 
                     onclick="selectCustomOption('${type}', 'all', '')">
                    -- ${isCat ? 'ทุกประเภทอะไหล่' : 'ทุกเครื่องจักร'} --
                </div>`;
            dropdown.insertAdjacentHTML('beforeend', allOptionHtml);

            let matchCount = 0;
            if (isCat) {
                catalogCategories.forEach(c => {
                    const textToSearch = c.toLowerCase();
                    if (keywords.length === 0 || keywords.every(kw => textToSearch.includes(kw))) {
                        dropdown.insertAdjacentHTML('beforeend', `<div class="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 transition text-gray-700" onclick="selectCustomOption('category', '${escapeForJS(c)}', '${escapeForJS(c)}')">${escapeHTML(c)}</div>`);
                        matchCount++;
                    }
                });
            } else {
                const displayLimit = 50;
                catalogMachines.forEach(m => {
                    const textToSearch = `${m.id} ${m.name}`.toLowerCase();
                    if (keywords.length === 0 || keywords.every(kw => textToSearch.includes(kw))) {
                        if (matchCount < displayLimit) {
                            dropdown.insertAdjacentHTML('beforeend', `<div class="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 transition" onclick="selectCustomOption('machine', '${escapeForJS(m.id)}', '${escapeForJS(m.id)} : ${escapeForJS(m.name)}')"><span class="font-bold text-blue-700">${escapeHTML(m.id)}</span> : <span class="text-gray-700">${escapeHTML(m.name)}</span></div>`);
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

        function selectCustomOption(type, value, displayLabel) {
            const isCat = type === 'category';
            const inputId = isCat ? 'input_filterCategory' : 'input_filterMachine';
            const hiddenId = isCat ? 'filterCategory' : 'filterMachine';
            const dropdownId = isCat ? 'dropdown_filterCategory' : 'dropdown_filterMachine';
            
            document.getElementById(hiddenId).value = value;
            document.getElementById(inputId).value = displayLabel; 
            document.getElementById(dropdownId).classList.add('hidden');
            
            currentCatalogPage = 1;
            
            if(!isCat && value !== 'all') {
                setCatalogMode('products');
            } else {
                renderCatalog();
            }
        }

        function toggleShowCost(checkboxElement) {
            isShowCostInCatalog = checkboxElement.checked;
            renderCatalog(); 
        }

        async function toggleShowGuestPriceB(checkboxElement) {
            isShowPriceBForGuest = checkboxElement.checked;
            renderCatalog();
            await saveSettingsToServer();
        }

        async function toggleShowGuestPriceC(checkboxElement) {
            isShowPriceCForGuest = checkboxElement.checked;
            renderCatalog();
            await saveSettingsToServer();
        }

        async function saveSettingsToServer() {
            try {
                let payload = {
                    isShowPriceBForGuest: isShowPriceBForGuest,
                    isShowPriceCForGuest: isShowPriceCForGuest
                };
                let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'saveSettings', payload: payload }) });
                let result = await res.json();
                if (result.status !== 'success') {
                    showToast('ไม่สามารถบันทึกการตั้งค่าไปยังเซิร์ฟเวอร์ได้: ' + result.message, 'error');
                }
            } catch (err) {
                showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อบันทึกการตั้งค่า', 'error');
            }
        }

        async function toggleProductCancelStatus(id, isChecked) {
            const p = db.products.find(x => x.id == id);
            if (!p) return;
            
            let newNote = isChecked ? 'ยกเลิกใช้' : '';
            if (!isChecked && p.note) {
                newNote = p.note.replace('ยกเลิกใช้', '').trim();
            } else if (isChecked) {
                if (p.note && !p.note.includes('ยกเลิกใช้')) {
                    newNote = (p.note + '\nยกเลิกใช้').trim();
                } else {
                    newNote = 'ยกเลิกใช้';
                }
            }

            showLoading('กำลังบันทึกสถานะ...');
            try {
                let payload = { 
                    id: p.id, name: p.name, unit: p.unit, 
                    cost: p.cost, category: p.category, note: newNote, imageBase64: null,
                    price_a: p.price_a,
                    price_b: p.price_b,
                    price_c: p.price_c,
                    stock_qty: p.stock_qty
                };
                let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'editProduct', payload: payload }) });
                let result = await res.json();
                if (result.status === 'success') { 
                    showToast('อัปเดตสถานะสำเร็จ'); 
                    fetchData(true);
                } else { 
                    showToast('เกิดข้อผิดพลาด: ' + result.message, 'error'); 
                    fetchData(true);
                }
            } catch (err) { 
                showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error'); 
                fetchData(true);
            }
            hideLoading();
        }

        function setCatalogMode(mode) {
            currentCatalogPage = 1;
            currentCatalogMode = mode;
            const btnProd = document.getElementById('tabModeProducts');
            const btnMach = document.getElementById('tabModeMachines');
            
            if(mode === 'products') {
                btnProd.className = 'flex-1 sm:flex-none px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-sm bg-white text-blue-600';
                btnMach.className = 'flex-1 sm:flex-none px-5 py-2 rounded-lg text-sm font-bold transition-all text-gray-500 hover:text-gray-700';
                document.getElementById('filterCategoryContainer').classList.remove('hidden');
                document.getElementById('filterMachineContainer').classList.remove('hidden');
            } else {
                btnMach.className = 'flex-1 sm:flex-none px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-sm bg-white text-blue-600';
                btnProd.className = 'flex-1 sm:flex-none px-5 py-2 rounded-lg text-sm font-bold transition-all text-gray-500 hover:text-gray-700';
                document.getElementById('filterCategoryContainer').classList.add('hidden');
                document.getElementById('filterMachineContainer').classList.add('hidden');
            }
            renderCatalog();
        }

        function renderMachineBanner(machineId) {
            const banner = document.getElementById('selectedMachineBanner');
            if (machineId === 'all') {
                banner.classList.add('hidden');
                return;
            }
            
            const m = db.machines.find(x => x.id == machineId);
            if (!m) {
                banner.classList.add('hidden');
                return;
            }

            banner.classList.remove('hidden');
            
            const imgSrc = m.image_url || 'https://placehold.co/400x300/334155/94a3b8?text=No+Image';
            const costVal = parseFloat(String(m.cost).replace(/,/g, '')) || 0;
            const costStr = costVal.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            const pA = fNumberM(m.price_a, costVal * 2.1);
            const pB = fNumberM(m.price_b, costVal * 1.7);
            const pC = fNumberM(m.price_c, costVal * 1.3);
            
            // คำนวณจำนวนอะไหล่ที่เชื่อมโยงกับเครื่องจักรนี้
            const validProductIds = new Set(db.products.map(p => String(p.id).trim()));
            let partsCount = 0;
            db.mappings.forEach(mapEntry => {
                if (String(mapEntry.machine_id).trim() === String(machineId).trim()) {
                    const pid = String(mapEntry.product_id).trim();
                    if (validProductIds.has(pid)) {
                        partsCount++;
                    }
                }
            });
            
            let costHtml = (isShowCostInCatalog && isLoggedIn) ? `<div class="bg-red-500/20 border border-red-400/30 px-3 py-1.5 rounded-lg text-red-200 text-sm font-medium">ต้นทุน: <span class="text-white font-bold text-base ml-1">฿${costStr}</span></div>` : '';
            
            let metaHtml = `
                <div class="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs text-slate-300 border-t border-white/10 pt-3">
                    ${m.group ? `<span><i class="fa-solid fa-folder mr-1.5 text-purple-400"></i><strong>กลุ่มเครื่องจักร:</strong> ${escapeHTML(m.group)}</span>` : ''}
                    ${(isLoggedIn && m.supplier) ? `<span><i class="fa-solid fa-truck-field mr-1.5 text-blue-400"></i><strong>ซัพพลายเออร์:</strong> ${escapeHTML(m.supplier)}</span>` : ''}
                    ${m.storage ? `<span><i class="fa-solid fa-map-location-dot mr-1.5 text-emerald-400"></i><strong>พื้นที่จัดเก็บ:</strong> ${escapeHTML(m.storage)}</span>` : ''}
                </div>
            `;

            banner.innerHTML = `
                <div class="absolute -right-10 -top-10 text-9xl text-white opacity-5 pointer-events-none"><i class="fa-solid fa-cogs"></i></div>
                <div class="flex flex-col md:flex-row gap-6 items-start relative z-10">
                    <div class="flex-shrink-0 bg-white/10 p-2 rounded-xl border border-white/20 flex items-center justify-center overflow-hidden self-center md:self-start">
                        <img src="${escapeHTML(imgSrc)}" class="max-w-[140px] max-h-[140px] md:max-w-[160px] md:max-h-[160px] w-auto h-auto object-contain rounded-lg bg-slate-100" onerror="this.src='https://placehold.co/400x300/334155/94a3b8?text=Err'">
                    </div>
                    <div class="flex-1 w-full">
                        <div class="flex flex-wrap items-center gap-3 mb-2">
                            <span class="bg-blue-500 text-white text-xs font-bold px-2.5 py-1 rounded-md tracking-wider shadow-sm">${escapeHTML(m.id)}</span>
                            <h3 class="text-2xl md:text-3xl font-bold text-white tracking-tight">${escapeHTML(m.name)}</h3>
                        </div>
                        <p class="text-slate-300 text-sm mb-4 line-clamp-2 leading-relaxed max-w-2xl">${escapeHTML(m.note || 'ไม่มีข้อมูลรายละเอียดเพิ่มเติม')}</p>
                        
                        <div class="flex flex-wrap gap-3 mt-auto">
                            ${costHtml}
                            ${(isLoggedIn && currentUser && currentUser.role !== 'ADMIN' && currentUser.role !== 'Manager') ? `
                                ${(currentUser.priceLevel === 'B') ? `
                                    <div class="bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-green-200 text-sm">ราคา: <span class="text-white font-bold ml-1">฿${pB}</span></div>
                                ` : (currentUser.priceLevel === 'C') ? `
                                    <div class="bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-orange-200 text-sm">ราคา: <span class="text-white font-bold ml-1">฿${pC}</span></div>
                                ` : (currentUser.priceLevel === 'COST') ? `
                                    <div class="bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-purple-200 text-sm">ราคา: <span class="text-white font-bold ml-1">฿${p.cost}</span></div>
                                ` : `
                                    <div class="bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-blue-200 text-sm">ราคา: <span class="text-white font-bold ml-1">฿${pA}</span></div>
                                `}
                            ` : `
                                <div class="bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-blue-200 text-sm">${(isLoggedIn || isShowPriceBForGuest || isShowPriceCForGuest) ? 'กลาง:' : 'ราคา:'} <span class="text-white font-bold ml-1">฿${pA}</span></div>
                                ${(isLoggedIn || isShowPriceBForGuest) ? `
                                <div class="bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-green-200 text-sm">ตัวแทน: <span class="text-white font-bold ml-1">฿${pB}</span></div>
                                ` : ''}
                                ${(isLoggedIn || isShowPriceCForGuest) ? `
                                <div class="bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-orange-200 text-sm">เครือ: <span class="text-white font-bold ml-1">฿${pC}</span></div>
                                ` : ''}
                            `}
                            <div class="bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-slate-200 text-sm font-medium"><i class="fa-solid fa-gears mr-1"></i>Spare Parts จำนวน: <span class="text-white font-bold ml-1">${partsCount}</span> ชิ้น</div>
                        </div>
                        ${metaHtml}
                    </div>
                    <div class="absolute top-0 right-0 hidden md:block">
                        <button onclick="document.getElementById('filterMachine').value='all'; document.getElementById('input_filterMachine').value=''; renderCatalog();" class="text-slate-400 hover:text-white bg-slate-800 hover:bg-red-500/80 transition-all p-2 rounded-lg text-xs font-medium border border-slate-600 shadow-sm"><i class="fa-solid fa-times mr-1"></i> ล้างการกรอง</button>
                    </div>
                </div>
            `;
        }

        function renderCatalog() {
            const grid = document.getElementById('productGrid');
            const searchKeywordString = document.getElementById('searchInput').value.toLowerCase();
            const searchKeywords = searchKeywordString.split(/\s+/).filter(k => k.length > 0);
            grid.innerHTML = '';

            const limit = parseInt(document.getElementById('catalogLimit').value) || 200;

            if (currentCatalogMode === 'products') {
                const selectedCategory = document.getElementById('filterCategory').value;
                const selectedMachine = document.getElementById('filterMachine').value;
                
                renderMachineBanner(selectedMachine);

                // สร้าง Set สำหรับ lookup O(1) เวลากรองตามเครื่องจักร
                let mappedProductIds = new Set();
                if (selectedMachine !== 'all') {
                    db.mappings.forEach(m => {
                        if (String(m.machine_id) === String(selectedMachine)) {
                            mappedProductIds.add(String(m.product_id));
                        }
                    });
                }

                let filteredProducts = db.products.filter(p => {
                    const textToSearch = `${p.id} ${p.name} ${p.group || ''} ${p.supplier || ''} ${p.storage || ''}`.toLowerCase();
                    const matchSearch = searchKeywords.length === 0 || searchKeywords.every(kw => textToSearch.includes(kw));
                    let matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
                    let matchMachine = selectedMachine === 'all' || mappedProductIds.has(String(p.id));
                    return matchSearch && matchCategory && matchMachine;
                });

                if (filteredProducts.length === 0) {
                    grid.innerHTML = `<div class="col-span-full py-16 flex flex-col items-center justify-center text-gray-400"><i class="fa-solid fa-box-open text-5xl mb-4 opacity-50"></i><p class="text-lg">ไม่พบข้อมูลสินค้าที่ตรงกับเงื่อนไข</p></div>`;
                    renderCatalogPagination(0);
                    return;
                }

                // สร้าง machineMap สำหรับ O(1) lookup ชื่อเครื่องจักรจาก mapping
                const machineMap = new Map();
                db.machines.forEach(m => machineMap.set(String(m.id), m));
                const productToMachinesMap = new Map();
                db.mappings.forEach(m => {
                    const pid = String(m.product_id);
                    const mac = machineMap.get(String(m.machine_id));
                    if (mac) {
                        if (!productToMachinesMap.has(pid)) productToMachinesMap.set(pid, []);
                        productToMachinesMap.get(pid).push(mac.name);
                    }
                });

                const totalItems = filteredProducts.length;
                const totalPages = Math.ceil(totalItems / limit);
                
                if (currentCatalogPage > totalPages) currentCatalogPage = totalPages;
                if (currentCatalogPage < 1) currentCatalogPage = 1;
                
                const startIndex = (currentCatalogPage - 1) * limit;
                const endIndex = startIndex + limit;
                const pageProducts = filteredProducts.slice(startIndex, endIndex);

                pageProducts.forEach(p => {
                    const relatedMachines = productToMachinesMap.get(String(p.id)) || [];
                    let badges = relatedMachines.map(name => `<span class="bg-gray-100 text-gray-600 text-[11px] px-2 py-0.5 rounded border border-gray-200 truncate max-w-full" title="${escapeHTML(name)}">${escapeHTML(name)}</span>`).join('');
                    let imgSource = p.image_url ? p.image_url : `https://placehold.co/400x300/f8fafc/94a3b8?text=No+Image`;

                    const costVal = parseFloat(String(p.cost).replace(/,/g, '')) || 0;
                    const costStr = costVal.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                    const pA = fNumberM(p.price_a, costVal * 2.1);
                    const pB = fNumberM(p.price_b, costVal * 1.7);
                    const pC = fNumberM(p.price_c, costVal * 1.3);

                    let costLineHtml = (isShowCostInCatalog && isLoggedIn) ? `<div class="flex justify-between items-center text-sm bg-red-50 px-2 py-1.5 rounded-lg mb-3 border border-red-100"><span class="text-red-700 font-medium">ราคาต้นทุน:</span><span class="font-bold text-red-600 text-base">฿${costStr} ต่อ ${escapeHTML(p.unit || 'ชิ้น')}</span></div>` : '';

                    const isCancelled = p.note && (p.note.trim() === 'ยกเลิกใช้' || p.note.includes('ยกเลิกใช้'));

                    const noteHtml = p.note ? `
                                <div class="mb-3 flex items-start gap-1.5 ${isCancelled ? 'bg-red-50 border border-red-100 text-red-800' : 'bg-amber-50 border border-amber-100 text-amber-800'} rounded-lg px-2.5 py-2">
                                    <i class="fa-solid ${isCancelled ? 'fa-circle-xmark text-red-500' : 'fa-note-sticky text-amber-400'} text-xs mt-0.5 flex-shrink-0"></i>
                                    <p class="text-xs ${isCancelled ? 'font-semibold text-red-700' : 'text-amber-800'} line-clamp-2 leading-relaxed" title="${escapeHTML(p.note)}">${escapeHTML(p.note)}</p>
                                </div>` : '';

                    let card = `
                        <div onclick="openProductDetailModal('${escapeForJS(p.id)}')" class="${isCancelled ? 'bg-red-50/20 border-red-200 hover:border-red-300' : 'bg-white border-gray-100 hover:border-blue-200'} rounded-2xl shadow-sm border overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col h-full transform hover:-translate-y-1 cursor-pointer">
                            <div class="h-48 sm:h-52 bg-slate-50 overflow-hidden relative flex-shrink-0 flex items-center justify-center">
                                <img src="${escapeHTML(imgSource)}" alt="${escapeHTML(p.name)}" class="max-w-full max-h-full object-contain p-2 group-hover:scale-105 transition duration-500 ${isCancelled ? 'opacity-50 grayscale-[30%]' : ''}" onerror="this.src='https://placehold.co/400x300/fee2e2/ef4444?text=Image+Error'">
                                <div class="absolute top-3 left-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-md text-xs font-bold text-gray-800 shadow-sm border border-gray-100">${escapeHTML(p.id)}</div>
                                <button class="img-zoom-btn" onclick="event.stopPropagation(); openImageLightbox('${escapeForJS(imgSource)}', '${escapeForJS(p.name)}')">
                                    <i class="fa-solid fa-magnifying-glass-plus"></i> ขยายภาพ
                                </button>
                                ${isCancelled ? `
                                <div class="absolute top-0 right-0 overflow-hidden w-24 h-24 pointer-events-none z-20">
                                    <div class="absolute bg-red-600 text-white text-[10px] font-bold text-center py-1 w-[140px] top-[22px] -right-[35px] rotate-45 shadow-sm uppercase tracking-wider">
                                        ยกเลิกใช้
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                            <div class="p-5 flex flex-col flex-1">
                                <h3 class="text-lg font-bold ${isCancelled ? 'text-gray-400 line-through decoration-red-500 decoration-2' : 'text-gray-800'} mb-1 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors" title="${escapeHTML(p.name)}">${escapeHTML(p.name)}</h3>
                                <div class="flex flex-wrap gap-2 mb-3">
                                    <span class="text-xs font-medium text-blue-500 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">${escapeHTML(p.category) || 'ไม่ระบุประเภท'}</span>
                                    <span class="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">หน่วย: ${escapeHTML(p.unit) || 'ชิ้น'}</span>
                                    ${p.stock_qty <= 0 ? 
                                        `<span class="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100"><i class="fa-solid fa-triangle-exclamation mr-1"></i>หมดสต็อก</span>` : 
                                      (p.stock_qty <= 5 ? 
                                        `<span class="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100"><i class="fa-solid fa-circle-exclamation mr-1"></i>เหลือน้อย: ${p.stock_qty}</span>` : 
                                        `<span class="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100"><i class="fa-solid fa-circle-check mr-1"></i>คงเหลือ: ${p.stock_qty}</span>`)}
                                </div>
                                <div class="mb-4">
                                    ${costLineHtml}
                                    <div class="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                                        ${(isLoggedIn && currentUser && currentUser.role === 'user') ? `
                                            ${(currentUser.priceLevel === 'B') ? `
                                                <div class="flex justify-between items-center text-sm"><span class="text-gray-500">ราคา:</span><span class="font-bold text-green-600 text-base">฿${pB} ต่อ ${escapeHTML(p.unit || 'ชิ้น')}</span></div>
                                            ` : (currentUser.priceLevel === 'C') ? `
                                                <div class="flex justify-between items-center text-sm"><span class="text-gray-500">ราคา:</span><span class="font-bold text-orange-600 text-base">฿${pC} ต่อ ${escapeHTML(p.unit || 'ชิ้น')}</span></div>
                                            ` : (currentUser.priceLevel === 'COST') ? `
                                                <div class="flex justify-between items-center text-sm"><span class="text-gray-500">ราคา:</span><span class="font-bold text-purple-600 text-base">฿${fNumber(p.cost, p.cost)} ต่อ ${escapeHTML(p.unit || 'ชิ้น')}</span></div>
                                            ` : `
                                                <div class="flex justify-between items-center text-sm"><span class="text-gray-500">ราคา:</span><span class="font-bold text-blue-600 text-base">฿${pA} ต่อ ${escapeHTML(p.unit || 'ชิ้น')}</span></div>
                                            `}
                                        ` : `
                                            <div class="flex justify-between items-center text-sm"><span class="text-gray-500">${(isLoggedIn || isShowPriceBForGuest || isShowPriceCForGuest) ? 'ราคากลาง:' : 'ราคา:'}</span><span class="font-bold text-blue-600 text-base">฿${pA} ต่อ ${escapeHTML(p.unit || 'ชิ้น')}</span></div>
                                            ${(isLoggedIn || isShowPriceBForGuest) ? `
                                            <div class="flex justify-between items-center text-sm"><span class="text-gray-500">ราคาตัวแทน:</span><span class="font-bold text-green-600 text-base">฿${pB} ต่อ ${escapeHTML(p.unit || 'ชิ้น')}</span></div>
                                            ` : ''}
                                            ${(isLoggedIn || isShowPriceCForGuest) ? `
                                            <div class="flex justify-between items-center text-sm"><span class="text-gray-500">ราคาในเครือ:</span><span class="font-bold text-orange-600 text-base">฿${pC} ต่อ ${escapeHTML(p.unit || 'ชิ้น')}</span></div>
                                            ` : ''}
                                        `}
                                    </div>
                                    <div class="flex flex-wrap gap-x-3 gap-y-1.5 mt-2.5 text-[11px] text-gray-500">
                                        ${p.group ? `<span><i class="fa-solid fa-folder mr-1 text-blue-500/80"></i><strong>กลุ่มสินค้า:</strong> ${escapeHTML(p.group)}</span>` : ''}
                                        ${(isLoggedIn && p.supplier) ? `<span><i class="fa-solid fa-truck-field mr-1 text-slate-500/85"></i><strong>ซัพพลายเออร์:</strong> ${escapeHTML(p.supplier)}</span>` : ''}
                                        ${p.storage ? `<span><i class="fa-solid fa-map-location-dot mr-1 text-emerald-600/80"></i><strong>พื้นที่จัดเก็บ:</strong> ${escapeHTML(p.storage)}</span>` : ''}
                                    </div>
                                </div>
                                ${noteHtml}
                                <div class="border-t border-gray-100 pt-3 mt-auto">
                                    <p class="text-[10px] text-gray-400 mb-2 uppercase tracking-wider font-semibold"><i class="fa-solid fa-microchip mr-1"></i> ใช้กับเครื่องจักร:</p>
                                    <div class="flex flex-wrap gap-1.5">${badges || '<span class="text-xs text-gray-400 italic bg-gray-50 px-2 py-1 rounded">ยังไม่ระบุ</span>'}</div>
                                </div>
                            </div>
                        </div>
                    `;
                    grid.insertAdjacentHTML('beforeend', card);
                });

                renderCatalogPagination(totalPages);

            } else {
                document.getElementById('selectedMachineBanner').classList.add('hidden');

                const validProductIds = new Set(db.products.map(p => String(p.id).trim()));
                const machinePartsCountMap = new Map();
                db.mappings.forEach(mapEntry => {
                    const pid = String(mapEntry.product_id).trim();
                    if (validProductIds.has(pid)) {
                        const mid = String(mapEntry.machine_id).trim();
                        machinePartsCountMap.set(mid, (machinePartsCountMap.get(mid) || 0) + 1);
                    }
                });

                let filteredMachines = db.machines.filter(m => {
                    const textToSearch = `${m.id} ${m.name} ${m.group || ''} ${m.supplier || ''} ${m.storage || ''}`.toLowerCase();
                    return searchKeywords.length === 0 || searchKeywords.every(kw => textToSearch.includes(kw));
                });

                if (filteredMachines.length === 0) {
                    grid.innerHTML = `<div class="col-span-full py-16 flex flex-col items-center justify-center text-gray-400"><i class="fa-solid fa-industry text-5xl mb-4 opacity-50"></i><p class="text-lg">ไม่พบข้อมูลเครื่องจักรที่ค้นหา</p></div>`;
                    renderCatalogPagination(0);
                    return;
                }

                const totalItemsM = filteredMachines.length;
                const totalPagesM = Math.ceil(totalItemsM / limit);
                
                if (currentCatalogPage > totalPagesM) currentCatalogPage = totalPagesM;
                if (currentCatalogPage < 1) currentCatalogPage = 1;
                
                const startIndexM = (currentCatalogPage - 1) * limit;
                const endIndexM = startIndexM + limit;
                const pageMachines = filteredMachines.slice(startIndexM, endIndexM);

                pageMachines.forEach(m => {
                    let imgSource = m.image_url ? m.image_url : `https://placehold.co/400x300/f8fafc/94a3b8?text=No+Image`;
                    const clickAction = `openMachineDetailModal('${escapeForJS(m.id)}');`;
                    const partsCount = machinePartsCountMap.get(String(m.id).trim()) || 0;

                    const costVal = parseFloat(String(m.cost).replace(/,/g, '')) || 0;
                    const costStr = costVal.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                    const pA = fNumberM(m.price_a, costVal * 2.1);
                    const pB = fNumberM(m.price_b, costVal * 1.7);
                    const pC = fNumberM(m.price_c, costVal * 1.3);

                    let costLineHtml = (isShowCostInCatalog && isLoggedIn) ? `<div class="flex justify-between items-center text-sm bg-red-50 px-2 py-1.5 rounded-lg mb-3 border border-red-100"><span class="text-red-700 font-medium">ราคาต้นทุน:</span><span class="font-bold text-red-600 text-base">฿${costStr}</span></div>` : '';

                    const isCancelledM = m.note && (m.note.trim() === 'ยกเลิกใช้' || m.note.includes('ยกเลิกใช้'));

                    let card = `
                        <div onclick="${clickAction}" class="${isCancelledM ? 'bg-red-50/20 border-red-200 hover:border-red-300' : 'bg-white border-gray-200 hover:border-purple-300'} rounded-2xl shadow-sm border overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col h-full transform hover:-translate-y-1 cursor-pointer">
                            <div class="h-56 bg-slate-800 overflow-hidden relative flex-shrink-0 flex items-center justify-center p-3">
                                <img src="${escapeHTML(imgSource)}" alt="${escapeHTML(m.name)}" class="max-w-full max-h-full object-contain group-hover:scale-105 transition duration-500 rounded ${isCancelledM ? 'opacity-40 grayscale-[30%]' : ''}" onerror="this.src='https://placehold.co/400x300/1e293b/94a3b8?text=Image+Error'">
                                <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                                <div class="absolute bottom-3 left-4 right-4">
                                    <span class="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-1 inline-block">Machine</span>
                                    <h3 class="text-base font-bold text-white line-clamp-2 leading-snug group-hover:text-purple-300 transition-colors ${isCancelledM ? 'line-through decoration-red-500 decoration-2' : ''}">${escapeHTML(m.name)}</h3>
                                </div>
                                ${isCancelledM ? `
                                <div class="absolute top-0 right-0 overflow-hidden w-24 h-24 pointer-events-none z-20">
                                    <div class="absolute bg-red-600 text-white text-[10px] font-bold text-center py-1 w-[140px] top-[22px] -right-[35px] rotate-45 shadow-sm uppercase tracking-wider">
                                        ยกเลิกใช้
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                            <div class="p-4 flex flex-col flex-1 bg-white">
                                <div class="flex items-center justify-between gap-2 mb-2 text-sm text-gray-500">
                                    <span><span class="font-bold text-gray-800">รหัส:</span> ${escapeHTML(m.id)}</span>
                                    <span class="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">หน่วย: ${escapeHTML(m.unit) || 'เครื่อง'}</span>
                                </div>
                                
                                <div class="mb-4">
                                    ${costLineHtml}
                                    <div class="space-y-1.5 bg-purple-50 p-3 rounded-xl border border-purple-100">
                                        <div class="flex justify-between items-center text-xs"><span class="text-gray-500">${(isLoggedIn || isShowPriceBForGuest || isShowPriceCForGuest) ? 'ราคากลาง:' : 'ราคา:'}</span><span class="font-bold text-blue-600">฿${pA}</span></div>
                                        ${(isLoggedIn || isShowPriceBForGuest) ? `
                                        <div class="flex justify-between items-center text-xs"><span class="text-gray-500">ราคาตัวแทน:</span><span class="font-bold text-green-600">฿${pB}</span></div>
                                        ` : ''}
                                        ${(isLoggedIn || isShowPriceCForGuest) ? `
                                        <div class="flex justify-between items-center text-xs"><span class="text-gray-500">ราคาในเครือ:</span><span class="font-bold text-orange-600">฿${pC}</span></div>
                                        ` : ''}
                                    </div>
                                    <div class="flex flex-wrap gap-x-3 gap-y-1.5 mt-2.5 text-[11px] text-gray-500">
                                        ${m.group ? `<span><i class="fa-solid fa-folder mr-1 text-purple-600/80"></i><strong>กลุ่มเครื่องจักร:</strong> ${escapeHTML(m.group)}</span>` : ''}
                                        ${(isLoggedIn && m.supplier) ? `<span><i class="fa-solid fa-truck-field mr-1 text-slate-500/85"></i><strong>ซัพพลายเออร์:</strong> ${escapeHTML(m.supplier)}</span>` : ''}
                                        ${m.storage ? `<span><i class="fa-solid fa-map-location-dot mr-1 text-emerald-600/80"></i><strong>พื้นที่จัดเก็บ:</strong> ${escapeHTML(m.storage)}</span>` : ''}
                                    </div>
                                </div>

                                ${m.note ? `
                                <div class="mb-4 flex items-start gap-1.5 ${isCancelledM ? 'bg-red-50 border border-red-100 text-red-800' : 'bg-slate-50 border border-slate-100 text-gray-500'} rounded-lg px-2.5 py-2">
                                    <i class="fa-solid ${isCancelledM ? 'fa-circle-xmark text-red-500' : 'fa-circle-info text-slate-400'} text-xs mt-0.5 flex-shrink-0"></i>
                                    <p class="text-xs ${isCancelledM ? 'font-semibold text-red-700' : 'text-gray-500'} line-clamp-2 leading-relaxed flex-1" title="${escapeHTML(m.note)}">${escapeHTML(m.note)}</p>
                                </div>
                                ` : '<p class="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-4 flex-1">ไม่มีรายละเอียดเพิ่มเติม</p>'}
                                <div class="mt-auto flex justify-between items-center pt-3 border-t border-gray-100">
                                    <span class="text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                        คลิกเพื่อดูอะไหล่ <i class="fa-solid fa-arrow-right ml-1 text-[10px]"></i>
                                    </span>
                                    <span class="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1" title="จำนวนอะไหล่ที่เชื่อมโยงกับเครื่องจักรนี้">
                                        <i class="fa-solid fa-wrench text-[9px] text-slate-400"></i>อะไหล่: <strong class="text-slate-800">${partsCount}</strong> ชิ้น
                                    </span>
                                </div>
                            </div>
                        </div>
                    `;
                    grid.insertAdjacentHTML('beforeend', card);
                });

                renderCatalogPagination(totalPagesM);
            }
        }

        function renderCatalogPagination(totalPages) {
            const container = document.getElementById('catalogPagination');
            container.innerHTML = '';
            
            if (totalPages <= 1) {
                container.classList.add('hidden');
                return;
            }
            container.classList.remove('hidden');
            
            const prevDisabled = currentCatalogPage === 1;
            let html = `
                <button onclick="changeCatalogPage(${currentCatalogPage - 1})" ${prevDisabled ? 'disabled' : ''} 
                        class="px-3.5 py-2 rounded-xl border text-sm font-semibold transition flex items-center justify-center gap-1.5 shadow-sm
                               ${prevDisabled ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed' : 'bg-white border-gray-200 text-gray-700 hover:bg-slate-50 active:scale-95'}">
                    <i class="fa-solid fa-chevron-left text-xs"></i> <<
                </button>
            `;
            
            const maxVisiblePages = 5;
            let startPage = Math.max(1, currentCatalogPage - 2);
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }
            
            if (startPage > 1) {
                html += `
                    <button onclick="changeCatalogPage(1)" class="w-10 h-10 rounded-xl border text-sm font-semibold transition bg-white border-gray-200 text-gray-700 hover:bg-slate-50 active:scale-95">1</button>
                `;
                if (startPage > 2) {
                    html += `<span class="text-gray-400 px-1">...</span>`;
                }
            }
            
            for (let i = startPage; i <= endPage; i++) {
                const isCurrent = i === currentCatalogPage;
                html += `
                    <button onclick="changeCatalogPage(${i})" 
                            class="w-10 h-10 rounded-xl border text-sm font-bold transition shadow-sm
                                   ${isCurrent ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-slate-50 active:scale-95'}">
                        ${i}
                    </button>
                `;
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    html += `<span class="text-gray-400 px-1">...</span>`;
                }
                html += `
                    <button onclick="changeCatalogPage(${totalPages})" class="w-10 h-10 rounded-xl border text-sm font-semibold transition bg-white border-gray-200 text-gray-700 hover:bg-slate-50 active:scale-95">${totalPages}</button>
                `;
            }
            
            const nextDisabled = currentCatalogPage === totalPages;
            html += `
                <button onclick="changeCatalogPage(${currentCatalogPage + 1})" ${nextDisabled ? 'disabled' : ''} 
                        class="px-3.5 py-2 rounded-xl border text-sm font-semibold transition flex items-center justify-center gap-1.5 shadow-sm
                               ${nextDisabled ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed' : 'bg-white border-gray-200 text-gray-700 hover:bg-slate-50 active:scale-95'}">
                    >> <i class="fa-solid fa-chevron-right text-xs"></i>
                </button>
            `;
            
            container.innerHTML = html;
        }

        function renderMapProductPagination(totalPages) {
            const container = document.getElementById('mapProductPagination');
            container.innerHTML = '';
            
            if (totalPages <= 1) {
                container.classList.add('hidden');
                return;
            }
            container.classList.remove('hidden');
            
            const prevDisabled = currentMapProductPage === 1;
            let html = `
                <button type="button" onclick="changeMapProductPage(${currentMapProductPage - 1})" ${prevDisabled ? 'disabled' : ''} 
                        class="px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition flex items-center justify-center gap-1 shadow-sm
                               ${prevDisabled ? 'bg-gray-100 border-gray-100 text-gray-300 cursor-not-allowed' : 'bg-white border-gray-200 text-gray-700 hover:bg-slate-50 active:scale-95'}">
                    <i class="fa-solid fa-chevron-left text-[10px]"></i> <<
                </button>
            `;
            
            const maxVisiblePages = 5;
            let startPage = Math.max(1, currentMapProductPage - 2);
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }
            
            if (startPage > 1) {
                html += `
                    <button type="button" onclick="changeMapProductPage(1)" class="w-8 h-8 rounded-lg border text-xs font-semibold transition bg-white border-gray-200 text-gray-700 hover:bg-slate-50 active:scale-95">1</button>
                `;
                if (startPage > 2) {
                    html += `<span class="text-gray-400 px-1 text-xs">...</span>`;
                }
            }
            
            for (let i = startPage; i <= endPage; i++) {
                const isCurrent = i === currentMapProductPage;
                html += `
                    <button type="button" onclick="changeMapProductPage(${i})" 
                            class="w-8 h-8 rounded-lg border text-xs font-bold transition shadow-sm
                                   ${isCurrent ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-slate-50 active:scale-95'}">
                        ${i}
                    </button>
                `;
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    html += `<span class="text-gray-400 px-1 text-xs">...</span>`;
                }
                html += `
                    <button type="button" onclick="changeMapProductPage(${totalPages})" class="w-8 h-8 rounded-lg border text-xs font-semibold transition bg-white border-gray-200 text-gray-700 hover:bg-slate-50 active:scale-95">${totalPages}</button>
                `;
            }
            
            const nextDisabled = currentMapProductPage === totalPages;
            html += `
                <button type="button" onclick="changeMapProductPage(${currentMapProductPage + 1})" ${nextDisabled ? 'disabled' : ''} 
                        class="px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition flex items-center justify-center gap-1 shadow-sm
                               ${nextDisabled ? 'bg-gray-100 border-gray-100 text-gray-300 cursor-not-allowed' : 'bg-white border-gray-200 text-gray-700 hover:bg-slate-50 active:scale-95'}">
                    >> <i class="fa-solid fa-chevron-right text-[10px]"></i>
                </button>
            `;
            
            container.innerHTML = html;
        }

        function changeCatalogPage(page) {
            currentCatalogPage = page;
            renderCatalog();
            document.getElementById('view-catalog').scrollIntoView({ behavior: 'smooth' });
        }

        function changeMapProductPage(page) {
            currentMapProductPage = page;
            filterMapProducts();
            document.getElementById('map_product_list').scrollTop = 0;
        }
                         // ===== RESTOCK PRODUCT LOGIC =====
        function initRestockView() {
            document.getElementById('searchRestockProduct').value = '';
            renderRestockTable();
        }

        // ===== Restock Pagination & Bulk Adjustment State =====
        let isBulkAdjusting = false;
        let bulkStockChanges = {};
        let restockCurrentPage = 1;

        function onRestockSearchChange() {
            restockCurrentPage = 1;
            renderRestockTable();
        }

        function changeRestockPage(page) {
            restockCurrentPage = page;
            renderRestockTable();
            const viewSection = document.getElementById('view-restock');
            if (viewSection) {
                viewSection.scrollTop = 0;
            }
        }

        function toggleBulkAdjustMode() {
            isBulkAdjusting = true;
            bulkStockChanges = {};
            const btnBulk = document.getElementById('btnBulkAdjustStock');
            const bulkActions = document.getElementById('bulkAdjustActions');
            const bulkBanner = document.getElementById('bulkAdjustBanner');
            if (btnBulk) btnBulk.classList.add('hidden');
            if (bulkActions) bulkActions.classList.remove('hidden');
            if (bulkBanner) bulkBanner.classList.remove('hidden');
            updateBulkChangeCountBadge();
            renderRestockTable();
        }

        function cancelBulkAdjustMode() {
            isBulkAdjusting = false;
            bulkStockChanges = {};
            const btnBulk = document.getElementById('btnBulkAdjustStock');
            const bulkActions = document.getElementById('bulkAdjustActions');
            const bulkBanner = document.getElementById('bulkAdjustBanner');
            if (btnBulk) btnBulk.classList.remove('hidden');
            if (bulkActions) bulkActions.classList.add('hidden');
            if (bulkBanner) bulkBanner.classList.add('hidden');
            renderRestockTable();
        }

        function onBulkStockInputChange(pId, val) {
            const p = db.products.find(x => x.id == pId);
            if (!p) return;
            const numVal = parseFloat(val);
            const currentStock = parseFloat(p.stock_qty) || 0;
            
            if (!isNaN(numVal) && numVal >= 0 && numVal !== currentStock) {
                bulkStockChanges[pId] = numVal;
            } else {
                delete bulkStockChanges[pId];
            }
            updateBulkChangeCountBadge();
        }

        function updateBulkChangeCountBadge() {
            const badge = document.getElementById('bulkChangeCountBadge');
            if (badge) {
                const count = Object.keys(bulkStockChanges).length;
                badge.innerText = `แก้ไขแล้ว ${count} รายการ`;
                if (count > 0) {
                    badge.className = "px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold text-xs flex-shrink-0 ml-2 shadow-sm animate-pulse";
                } else {
                    badge.className = "px-3 py-1 bg-amber-200 text-amber-900 rounded-lg font-bold text-xs flex-shrink-0 ml-2";
                }
            }
        }

        async function saveBulkAdjustStock() {
            const changedProductIds = Object.keys(bulkStockChanges);
            if (changedProductIds.length === 0) {
                showToast('ไม่มีการเปลี่ยนแปลงจำนวนสต็อก', 'info');
                cancelBulkAdjustMode();
                return;
            }

            const itemsToUpdate = [];
            changedProductIds.forEach(pId => {
                const p = db.products.find(x => x.id == pId);
                if (p) {
                    const newQty = parseFloat(bulkStockChanges[pId]);
                    const currentQty = parseFloat(p.stock_qty) || 0;
                    if (!isNaN(newQty) && newQty >= 0 && newQty !== currentQty) {
                        itemsToUpdate.push({
                            product: p,
                            newQty: newQty,
                            currentQty: currentQty,
                            diff: newQty - currentQty
                        });
                    }
                }
            });

            if (itemsToUpdate.length === 0) {
                showToast('ไม่มีการเปลี่ยนแปลงจำนวนสต็อกที่ถูกต้อง', 'info');
                cancelBulkAdjustMode();
                return;
            }

            const confirmMsg = `ต้องการบันทึกการปรับยอดสต็อกอะไหล่จำนวน ${itemsToUpdate.length} รายการ ใช่หรือไม่?`;
            if (!confirm(confirmMsg)) return;

            const operator = (isLoggedIn && currentUser && currentUser.fullName) ? currentUser.fullName : 'สโตร์';

            showLoading(`กำลังบันทึกการปรับยอดสต็อก (0/${itemsToUpdate.length})...`);

            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < itemsToUpdate.length; i++) {
                const item = itemsToUpdate[i];
                showLoading(`กำลังบันทึกการปรับยอดสต็อก (${i + 1}/${itemsToUpdate.length})...`);

                const payload = {
                    id: item.product.id,
                    qty: item.diff,
                    requester: operator,
                    department: "สโตร์ (ปรับสต็อกหลายรายการ)",
                    note: `ปรับยอดสต็อกอะไหล่หลายรายการ (จาก ${item.currentQty} เป็น ${item.newQty})`
                };

                try {
                    let res = await fetch(API_URL, {
                        method: 'POST',
                        body: JSON.stringify({ action: 'restockProduct', payload: payload })
                    });
                    let result = await res.json();
                    if (result.status === 'success') {
                        successCount++;
                    } else {
                        failCount++;
                    }
                } catch (err) {
                    console.error(err);
                    failCount++;
                }
            }

            hideLoading();

            if (successCount > 0) {
                showToast(`บันทึกการปรับปรุงสต็อกสำเร็จ ${successCount} รายการ ${failCount > 0 ? `(ล้มเหลว ${failCount} รายการ)` : ''}`, failCount > 0 ? 'warning' : 'success');
                await fetchData(false);
            } else {
                showToast('เกิดข้อผิดพลาด ไม่สามารถปรับปรุงสต็อกได้', 'error');
            }

            isBulkAdjusting = false;
            bulkStockChanges = {};
            const btnBulk = document.getElementById('btnBulkAdjustStock');
            const bulkActions = document.getElementById('bulkAdjustActions');
            const bulkBanner = document.getElementById('bulkAdjustBanner');
            if (btnBulk) btnBulk.classList.remove('hidden');
            if (bulkActions) bulkActions.classList.add('hidden');
            if (bulkBanner) bulkBanner.classList.add('hidden');
            renderRestockTable();
        }

        function renderRestockPagination(totalItems, currentPage, totalPages) {
            const infoEl = document.getElementById('restockPaginationInfo');
            const controlsEl = document.getElementById('restockPaginationControls');
            if (!infoEl || !controlsEl) return;

            if (totalItems === 0) {
                infoEl.innerText = "ไม่พบรายการอะไหล่";
                controlsEl.innerHTML = '';
                return;
            }

            const pageSize = 20;
            const startItem = (currentPage - 1) * pageSize + 1;
            const endItem = Math.min(currentPage * pageSize, totalItems);
            infoEl.innerHTML = `แสดง <span class="font-bold text-slate-800">${startItem} - ${endItem}</span> จากทั้งหมด <span class="font-bold text-slate-800">${totalItems}</span> รายการ (หน้า <span class="font-bold text-blue-600">${currentPage}</span> / ${totalPages})`;

            let buttonsHtml = '';

            // First page <<
            buttonsHtml += `
                <button onclick="changeRestockPage(1)" ${currentPage === 1 ? 'disabled class="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed border border-gray-200"' : 'class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm"'} title="หน้าแรก">
                    <i class="fa-solid fa-angles-left"></i>
                </button>
            `;

            // Prev page <
            buttonsHtml += `
                <button onclick="changeRestockPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled class="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed border border-gray-200"' : 'class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm"'} title="หน้าก่อนหน้า">
                    <i class="fa-solid fa-angle-left mr-1"></i> ก่อนหน้า
                </button>
            `;

            // Page numbers
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, currentPage + 2);

            if (startPage > 1) {
                buttonsHtml += `<button onclick="changeRestockPage(1)" class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition shadow-sm">1</button>`;
                if (startPage > 2) {
                    buttonsHtml += `<span class="px-1 text-gray-400 text-xs font-bold">...</span>`;
                }
            }

            for (let p = startPage; p <= endPage; p++) {
                if (p === currentPage) {
                    buttonsHtml += `<button class="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-extrabold shadow-md shadow-blue-500/20 cursor-default">${p}</button>`;
                } else {
                    buttonsHtml += `<button onclick="changeRestockPage(${p})" class="px-3.5 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm">${p}</button>`;
                }
            }

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    buttonsHtml += `<span class="px-1 text-gray-400 text-xs font-bold">...</span>`;
                }
                buttonsHtml += `<button onclick="changeRestockPage(${totalPages})" class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition shadow-sm">${totalPages}</button>`;
            }

            // Next page >
            buttonsHtml += `
                <button onclick="changeRestockPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled class="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed border border-gray-200"' : 'class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm"'} title="หน้าถัดไป">
                    ถัดไป <i class="fa-solid fa-angle-right ml-1"></i>
                </button>
            `;

            // Last page >>
            buttonsHtml += `
                <button onclick="changeRestockPage(${totalPages})" ${currentPage === totalPages ? 'disabled class="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed border border-gray-200"' : 'class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm"'} title="หน้าสุดท้าย">
                    <i class="fa-solid fa-angles-right"></i>
                </button>
            `;

            controlsEl.innerHTML = buttonsHtml;
        }

        function renderRestockTable() {
            const tbody = document.getElementById('restockTableBody');
            if (!tbody) return;
            const searchKeywordString = document.getElementById('searchRestockProduct')?.value.toLowerCase() || '';
            const searchKeywords = searchKeywordString.split(/\s+/).filter(k => k.length > 0);
            tbody.innerHTML = '';

            let filteredProducts = db.products;
            if (searchKeywords.length > 0) {
                filteredProducts = filteredProducts.filter(p => {
                    const textToSearch = `${p.id} ${p.name} ${p.category || ''}`.toLowerCase();
                    return searchKeywords.every(kw => textToSearch.includes(kw));
                });
            }

            const totalItems = filteredProducts.length;
            const pageSize = 20;
            const totalPages = Math.ceil(totalItems / pageSize) || 1;

            if (restockCurrentPage > totalPages) restockCurrentPage = totalPages;
            if (restockCurrentPage < 1) restockCurrentPage = 1;

            renderRestockPagination(totalItems, restockCurrentPage, totalPages);

            if (totalItems === 0) { 
                tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-gray-500 font-medium">ไม่พบรายการอะไหล่ที่ค้นหา</td></tr>`; 
                return; 
            }

            const startIndex = (restockCurrentPage - 1) * pageSize;
            const pagedProducts = filteredProducts.slice(startIndex, startIndex + pageSize);

            pagedProducts.forEach((p, index) => {
                const isCancelled = p.note && (p.note.trim() === 'ยกเลิกใช้' || p.note.includes('ยกเลิกใช้'));
                const itemIndex = startIndex + index + 1;

                let stockCellHtml = '';
                if (isBulkAdjusting) {
                    const currentStockVal = (bulkStockChanges[p.id] !== undefined) ? bulkStockChanges[p.id] : (p.stock_qty || 0);
                    const isEdited = (bulkStockChanges[p.id] !== undefined);
                    stockCellHtml = `
                        <div class="flex items-center justify-center">
                            <input type="number" 
                                   min="0" 
                                   step="1"
                                   value="${currentStockVal}" 
                                   oninput="onBulkStockInputChange('${escapeForJS(p.id)}', this.value)"
                                   onchange="onBulkStockInputChange('${escapeForJS(p.id)}', this.value)"
                                   class="w-28 text-center border-2 ${isEdited ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200 font-black' : 'border-blue-400 bg-blue-50/50 text-blue-700 font-bold'} focus:border-blue-600 focus:bg-white rounded-xl py-1.5 px-2 text-base shadow-inner focus:outline-none transition" 
                                   placeholder="0">
                        </div>
                    `;
                } else {
                    stockCellHtml = `<span class="font-extrabold text-blue-600 text-base">${p.stock_qty || 0}</span>`;
                }

                let tr = `
                    <tr class="hover:bg-blue-50/30 border-b border-gray-200 transition ${isCancelled ? 'bg-red-50/10' : ''} ${bulkStockChanges[p.id] !== undefined ? 'bg-emerald-50/30' : ''}">
                        <td class="p-4 text-center text-gray-500 font-medium">${itemIndex}</td>
                        <td class="p-3"><img src="${escapeHTML(p.image_url || 'https://placehold.co/100x100?text=NoImg')}" class="w-12 h-12 object-cover rounded-lg shadow-sm border border-gray-200 bg-white ${isCancelled ? 'opacity-50 grayscale' : ''}" onerror="this.src='https://placehold.co/100x100?text=Err'"></td>
                        <td class="p-4 font-semibold ${isCancelled ? 'text-gray-400 line-through decoration-red-500' : 'text-gray-800'}">${escapeHTML(p.id)}</td>
                        <td class="p-4 ${isCancelled ? 'text-gray-400 line-through decoration-red-500' : 'text-gray-700'} max-w-xs truncate" title="${escapeHTML(p.name)}">${escapeHTML(p.name)}</td>
                        <td class="p-4 text-gray-500">${escapeHTML(p.category || 'ทั่วไป')}</td>
                        <td class="p-4 text-gray-600">${escapeHTML(p.unit || '-')}</td>
                        <td class="p-4 text-center">${stockCellHtml}</td>
                        <td class="p-4 text-center">
                            <div class="flex items-center justify-center gap-2">
                                <button onclick="openAdjustStockModal('${escapeForJS(p.id)}')" ${isBulkAdjusting ? 'disabled class="opacity-40 cursor-not-allowed text-blue-600 bg-blue-50 px-3 py-2 rounded-lg text-xs font-semibold"' : 'class="text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 px-3 py-2 rounded-lg text-xs font-semibold transition shadow-sm inline-flex items-center"'} title="ปรับสต็อก"><i class="fa-solid fa-sliders mr-1"></i> ปรับสต็อก</button>
                                <button onclick="generateQRCodeModal('${escapeForJS(p.id)}')" ${isBulkAdjusting ? 'disabled class="opacity-40 cursor-not-allowed text-sky-600 bg-sky-50 px-3 py-2 rounded-lg text-xs font-semibold"' : 'class="text-sky-600 hover:text-white bg-sky-50 hover:bg-sky-600 px-3 py-2 rounded-lg text-xs font-semibold transition shadow-sm inline-flex items-center"'} title="สร้าง QR Code"><i class="fa-solid fa-qrcode mr-1"></i> QR Code</button>
                            </div>
                        </td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', tr);
            });
        }

        function openAdjustStockModal(id) {
            const p = db.products.find(x => x.id == id);
            if (!p) return;
            
            document.getElementById('adj_product_id').value = p.id;
            document.getElementById('adj_current_stock').value = p.stock_qty || 0;
            document.getElementById('adj_prod_title').innerText = `รหัสอะไหล่: ${p.id}`;
            document.getElementById('adj_prod_name').innerText = p.name || '';
            document.getElementById('adj_prod_stock').innerText = p.stock_qty || 0;
            document.getElementById('adj_prod_unit').innerText = p.unit || 'ชิ้น';
            
            document.getElementById('adj_qty').value = '';
            document.getElementById('adj_note').value = '';
            
            // Reset to default mode "add"
            const addRadio = document.querySelector('input[name="adjust_mode"][value="add"]');
            if (addRadio) {
                addRadio.checked = true;
            }
            updateAdjustModeUI();
            
            if (isLoggedIn && currentUser) {
                document.getElementById('adj_operator').value = currentUser.fullName || '';
            } else {
                document.getElementById('adj_operator').value = '';
            }
            
            document.getElementById('adjustStockModal').classList.remove('hidden');
        }

        function closeAdjustStockModal() {
            document.getElementById('adjustStockModal').classList.add('hidden');
        }

        function updateAdjustModeUI() {
            const radios = document.getElementsByName('adjust_mode');
            radios.forEach(radio => {
                const label = radio.parentElement;
                if (radio.checked) {
                    label.classList.remove('border-gray-200');
                    label.classList.add('border-blue-600', 'bg-blue-50/50');
                } else {
                    label.classList.remove('border-blue-600', 'bg-blue-50/50');
                    label.classList.add('border-gray-200');
                }
            });
            updateAdjustPlaceholder();
        }

        function updateAdjustPlaceholder() {
            const mode = document.querySelector('input[name="adjust_mode"]:checked').value;
            const qtyLabel = document.getElementById('adj_qty_label');
            const qtyInput = document.getElementById('adj_qty');
            
            if (mode === 'add') {
                qtyLabel.innerHTML = 'จำนวนที่ต้องการเติม <span class="text-red-500">*</span>';
                qtyInput.placeholder = 'เช่น 10, 50';
                qtyInput.min = '0.01';
            } else if (mode === 'subtract') {
                qtyLabel.innerHTML = 'จำนวนที่ต้องการลด <span class="text-red-500">*</span>';
                qtyInput.placeholder = 'เช่น 5, 20';
                qtyInput.min = '0.01';
            } else if (mode === 'set') {
                qtyLabel.innerHTML = 'กำหนดจำนวนสต็อกใหม่ <span class="text-red-500">*</span>';
                qtyInput.placeholder = 'เช่น 0, 100';
                qtyInput.min = '0';
            }
        }

        async function submitAdjustStock(e) {
            e.preventDefault();
            const productId = document.getElementById('adj_product_id').value;
            const currentStock = parseFloat(document.getElementById('adj_current_stock').value) || 0;
            const mode = document.querySelector('input[name="adjust_mode"]:checked').value;
            const qty = parseFloat(document.getElementById('adj_qty').value);
            const operator = document.getElementById('adj_operator').value.trim();
            const note = document.getElementById('adj_note').value.trim();
            
            if (!productId) return;
            
            if (isNaN(qty) || qty < 0) {
                showToast("กรุณาระบุจำนวนที่ถูกต้อง", "error");
                return;
            }
            
            if (mode === 'add' && qty <= 0) {
                showToast("จำนวนที่เติมต้องมากกว่า 0", "error");
                return;
            }
            if (mode === 'subtract' && qty <= 0) {
                showToast("จำนวนที่ลดต้องมากกว่า 0", "error");
                return;
            }
            
            if (mode === 'subtract' && qty > currentStock) {
                showToast(`ไม่สามารถปรับลดสต็อกมากกว่าจำนวนคงเหลือได้ (สต็อกคงเหลือปัจจุบัน: ${currentStock})`, "error");
                return;
            }
            
            let qtyToSend = 0;
            let transactionNote = "";
            
            if (mode === 'add') {
                qtyToSend = qty;
                transactionNote = note || "เติมสต็อกอะไหล่";
            } else if (mode === 'subtract') {
                qtyToSend = -qty;
                transactionNote = note || "ปรับลดสต็อกอะไหล่";
            } else if (mode === 'set') {
                qtyToSend = qty - currentStock;
                transactionNote = note || `ปรับยอดสต็อกอะไหล่ (จาก ${currentStock} เป็น ${qty})`;
            }
            
            if (qtyToSend === 0) {
                showToast("ไม่มีการเปลี่ยนแปลงจำนวนสต็อก", "info");
                closeAdjustStockModal();
                return;
            }
            
            const payload = {
                id: productId,
                qty: qtyToSend,
                requester: operator,
                department: "สโตร์ (ปรับปรุงสต็อก)",
                note: transactionNote
            };
            
            showLoading('กำลังบันทึกข้อมูลการปรับปรุงสต็อก...');
            try {
                let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'restockProduct', payload: payload }) });
                let result = await res.json();
                if (result.status === 'success') {
                    showToast('ปรับปรุงยอดสต็อกสำเร็จเรียบร้อย');
                    closeAdjustStockModal();
                    await fetchData(false);
                    renderRestockTable();
                } else {
                    showToast('เกิดข้อผิดพลาด: ' + result.message, 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อปรับปรุงสต็อกได้', 'error');
            }
            hideLoading();
        }

        function openMachineDetailModal(id) {
            const m = db.machines.find(x => x.id === id || x.id == id);
            if (!m) return;

            document.getElementById('mdm_id').innerText = m.id;
            document.getElementById('mdm_name').innerText = m.name;
            document.getElementById('mdm_unit').innerText = 'หน่วย: ' + (m.unit || 'เครื่อง');
            document.getElementById('mdm_group').innerText = m.group || '-';
            document.getElementById('mdm_supplier').innerText = m.supplier || '-';
            document.getElementById('mdm_storage').innerText = m.storage || '-';
            
            const supContainer = document.getElementById('mdm_supplier_container');
            if (supContainer) {
                supContainer.classList.toggle('hidden', !isLoggedIn);
            }
            
            const mdmNoteEl = document.getElementById('mdm_note');
            mdmNoteEl.innerText = m.note || 'ไม่มีรายละเอียดเพิ่มเติม';
            
            const isCancelledM = m.note && (m.note.trim() === 'ยกเลิกใช้' || m.note.includes('ยกเลิกใช้'));
            if (isCancelledM) {
                mdmNoteEl.className = "text-red-700 font-semibold text-sm whitespace-pre-line leading-relaxed bg-red-50 border border-red-200 rounded-xl p-4";
                document.getElementById('mdm_name').className = "text-2xl sm:text-3xl font-extrabold text-gray-400 line-through decoration-red-500 decoration-2 leading-snug";
            } else {
                mdmNoteEl.className = "text-gray-700 text-sm whitespace-pre-line leading-relaxed bg-gray-50 border border-gray-100 rounded-xl p-4";
                document.getElementById('mdm_name').className = "text-2xl sm:text-3xl font-extrabold text-gray-900 leading-snug";
            }
            document.getElementById('mdm_image').src = m.image_url || 'https://placehold.co/800x500/1e293b/94a3b8?text=No+Image';

            const costVal = parseFloat(String(m.cost).replace(/,/g, '')) || 0;
            document.getElementById('mdm_cost').innerText = '฿' + costVal.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            if (isShowCostInCatalog && isLoggedIn) document.getElementById('mdm_cost_box').classList.remove('hidden');
            else document.getElementById('mdm_cost_box').classList.add('hidden');
            const mdmPriceABox = document.getElementById('mdm_price_a_box');
            const mdmPriceBBox = document.getElementById('mdm_price_b_box');
            const mdmPriceCBox = document.getElementById('mdm_price_c_box');
            
            document.getElementById('mdm_price_a').innerText = '฿' + fNumberM(m.price_a, costVal * 2.1);
            document.getElementById('mdm_price_b').innerText = '฿' + fNumberM(m.price_b, costVal * 1.7);
            document.getElementById('mdm_price_c').innerText = '฿' + fNumberM(m.price_c, costVal * 1.3);
            
            if (isLoggedIn && currentUser && currentUser.role !== 'ADMIN' && currentUser.role !== 'Manager') {
                const userPriceLevel = currentUser.priceLevel || 'A';
                
                if (userPriceLevel === 'COST') {
                    mdmPriceABox.classList.remove('hidden');
                    mdmPriceBBox.classList.add('hidden');
                    mdmPriceCBox.classList.add('hidden');
                    document.getElementById('mdm_price_a_label').innerText = 'ราคา (ต้นทุน)';
                    document.getElementById('mdm_price_a').innerText = '฿' + costVal.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                } else {
                    mdmPriceABox.classList.toggle('hidden', userPriceLevel !== 'A');
                    mdmPriceBBox.classList.toggle('hidden', userPriceLevel !== 'B');
                    mdmPriceCBox.classList.toggle('hidden', userPriceLevel !== 'C');
                    
                    document.getElementById('mdm_price_a_label').innerText = 'ราคา';
                    const bLabel = mdmPriceBBox.querySelector('p');
                    if (bLabel) bLabel.innerText = 'ราคา';
                    const cLabel = mdmPriceCBox.querySelector('p');
                    if (cLabel) cLabel.innerText = 'ราคา';
                    document.getElementById('mdm_price_a').innerText = '฿' + fNumberM(m.price_a, costVal * 2.1);
                }
            } else {
                mdmPriceABox.classList.remove('hidden');
                document.getElementById('mdm_price_a_label').innerText = (isLoggedIn || isShowPriceBForGuest || isShowPriceCForGuest) ? 'ราคากลาง' : 'ราคา';
                
                const bLabel = mdmPriceBBox.querySelector('p');
                if (bLabel) bLabel.innerText = 'ราคาตัวแทน';
                const cLabel = mdmPriceCBox.querySelector('p');
                if (cLabel) cLabel.innerText = 'ราคาในเครือ';
                
                if (isLoggedIn || isShowPriceBForGuest) {
                    mdmPriceBBox.classList.remove('hidden');
                } else {
                    mdmPriceBBox.classList.add('hidden');
                }
                
                if (isLoggedIn || isShowPriceCForGuest) {
                    mdmPriceCBox.classList.remove('hidden');
                } else {
                    mdmPriceCBox.classList.add('hidden');
                }
            }

            // ผูกปุ่มดูอะไหล่
            const viewBtn = document.getElementById('mdm_view_parts_btn');
            viewBtn.onclick = function() {
                closeMachineDetailModal();
                document.getElementById('filterMachine').value = m.id;
                document.getElementById('input_filterMachine').value = m.id + ' : ' + m.name;
                setCatalogMode('products');
            };

            document.getElementById('machineDetailModal').classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }

        function closeMachineDetailModal() {
            document.getElementById('machineDetailModal').classList.add('hidden');
            document.body.style.overflow = '';
        }

        function openProductDetailModal(id) {
            const p = db.products.find(x => x.id == id);
            if (!p) return;

            document.getElementById('pd_id').innerText = p.id;
            document.getElementById('pd_name').innerText = p.name;
            document.getElementById('pd_category').innerText = p.category || 'ไม่ระบุ';
            document.getElementById('pd_unit').innerText = 'หน่วย: ' + (p.unit || 'ชิ้น');
            document.getElementById('pd_group').innerText = p.group || '-';
            document.getElementById('pd_supplier').innerText = p.supplier || '-';
            document.getElementById('pd_storage').innerText = p.storage || '-';
            
            const supContainer = document.getElementById('pd_supplier_container');
            if (supContainer) {
                supContainer.classList.toggle('hidden', !isLoggedIn);
            }
            
            const pdStockEl = document.getElementById('pd_stock');
            if (p.stock_qty <= 0) {
                pdStockEl.className = "bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm";
                pdStockEl.innerText = "หมดสต็อก";
            } else {
                pdStockEl.className = "bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm";
                pdStockEl.innerText = "คงเหลือในคลัง: " + p.stock_qty + " " + (p.unit || 'ชิ้น');
            }
            
            const pdNoteEl = document.getElementById('pd_note');
            pdNoteEl.innerText = p.note || '-';
            
            const isCancelled = p.note && (p.note.trim() === 'ยกเลิกใช้' || p.note.includes('ยกเลิกใช้'));
            if (isCancelled) {
                pdNoteEl.className = "text-red-700 font-semibold text-sm whitespace-pre-line leading-relaxed bg-red-50 border border-red-200 rounded-xl p-4";
                document.getElementById('pd_name').className = "text-2xl sm:text-3xl font-extrabold text-gray-400 line-through decoration-red-500 decoration-2 leading-snug";
            } else {
                pdNoteEl.className = "text-gray-700 text-sm whitespace-pre-line leading-relaxed bg-gray-50 border border-gray-100 rounded-xl p-4";
                document.getElementById('pd_name').className = "text-2xl sm:text-3xl font-extrabold text-gray-900 leading-snug";
            }
            document.getElementById('pd_image').src = p.image_url || 'https://placehold.co/400x300/f8fafc/94a3b8?text=No+Image';
            
            const costVal = parseFloat(String(p.cost).replace(/,/g, '')) || 0;
            document.getElementById('pd_cost').innerText = '฿' + costVal.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            const pdPriceABox = document.getElementById('pd_price_a_box');
            const pdPriceBBox = document.getElementById('pd_price_b_box');
            const pdPriceCBox = document.getElementById('pd_price_c_box');
            
            document.getElementById('pd_price_a').innerText = '฿' + fNumberM(p.price_a, costVal * 2.1);
            document.getElementById('pd_price_b').innerText = '฿' + fNumberM(p.price_b, costVal * 1.7);
            document.getElementById('pd_price_c').innerText = '฿' + fNumberM(p.price_c, costVal * 1.3);
            
            if (isLoggedIn && currentUser && currentUser.role !== 'ADMIN' && currentUser.role !== 'Manager') {
                const userPriceLevel = currentUser.priceLevel || 'A';
                
                if (userPriceLevel === 'COST') {
                    pdPriceABox.classList.remove('hidden');
                    pdPriceBBox.classList.add('hidden');
                    pdPriceCBox.classList.add('hidden');
                    document.getElementById('pd_price_a_label').innerText = 'ราคา (ต้นทุน)';
                    document.getElementById('pd_price_a').innerText = '฿' + costVal.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                } else {
                    pdPriceABox.classList.toggle('hidden', userPriceLevel !== 'A');
                    pdPriceBBox.classList.toggle('hidden', userPriceLevel !== 'B');
                    pdPriceCBox.classList.toggle('hidden', userPriceLevel !== 'C');
                    
                    document.getElementById('pd_price_a_label').innerText = 'ราคา';
                    const bLabel = pdPriceBBox.querySelector('p');
                    if (bLabel) bLabel.innerText = 'ราคา';
                    const cLabel = pdPriceCBox.querySelector('p');
                    if (cLabel) cLabel.innerText = 'ราคา';
                    document.getElementById('pd_price_a').innerText = '฿' + fNumberM(p.price_a, costVal * 2.1);
                }
            } else {
                pdPriceABox.classList.remove('hidden');
                document.getElementById('pd_price_a_label').innerText = (isLoggedIn || isShowPriceBForGuest || isShowPriceCForGuest) ? 'ราคากลาง' : 'ราคา';
                
                const bLabel = pdPriceBBox.querySelector('p');
                if (bLabel) bLabel.innerText = 'ราคาตัวแทน';
                const cLabel = pdPriceCBox.querySelector('p');
                if (cLabel) cLabel.innerText = 'ราคาในเครือ';
                
                if (isLoggedIn || isShowPriceBForGuest) {
                    pdPriceBBox.classList.remove('hidden');
                } else {
                    pdPriceBBox.classList.add('hidden');
                }
                
                if (isLoggedIn || isShowPriceCForGuest) {
                    pdPriceCBox.classList.remove('hidden');
                } else {
                    pdPriceCBox.classList.add('hidden');
                }
            }

            if(isShowCostInCatalog && isLoggedIn) document.getElementById('pd_cost_box').classList.remove('hidden');
            else document.getElementById('pd_cost_box').classList.add('hidden');

            // แก้บัค 1: ใช้ == แทน === เพื่อรองรับกรณี product_id ใน mapping เป็น number แต่ p.id เป็น string
            const relatedMachineIds = db.mappings.filter(m => m.product_id == p.id).map(m => m.machine_id);
            const machineGrid = document.getElementById('pd_machines_grid');
            machineGrid.innerHTML = '';

            if (relatedMachineIds.length === 0) {
                machineGrid.innerHTML = `<div class="col-span-full py-6 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200"><p class="text-sm"><i class="fa-solid fa-link-slash mr-2"></i>ยังไม่มีการจับคู่เครื่องจักรกับอะไหล่ชิ้นนี้</p></div>`;
            } else {
                relatedMachineIds.forEach(mId => {
                    // แก้บัค 2: ใช้ == แทน === เพื่อรองรับ type mismatch ระหว่าง machine_id ใน mapping กับ mac.id
                    const m = db.machines.find(mac => mac.id == mId);
                    if (m) {
                        let mImg = m.image_url || 'https://placehold.co/100x100/334155/94a3b8?text=No+Img';
                        let action = `closeProductDetailModal(); document.getElementById('filterMachine').value='${escapeForJS(m.id)}'; document.getElementById('input_filterMachine').value='${escapeForJS(m.id)} : ${escapeForJS(m.name)}'; renderCatalog();`;
                        
                        let mCard = `
                            <div onclick="${action}" class="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition cursor-pointer group">
                                <img src="${escapeHTML(mImg)}" class="w-12 h-12 object-cover rounded-lg bg-slate-100" onerror="this.src='https://placehold.co/100x100/334155/94a3b8?text=Err'">
                                <div>
                                    <p class="text-xs font-bold text-gray-500 mb-0.5 group-hover:text-blue-500 transition">${escapeHTML(m.id)}</p>
                                    <p class="text-sm font-semibold text-gray-800 line-clamp-1" title="${escapeHTML(m.name)}">${escapeHTML(m.name)}</p>
                                </div>
                            </div>
                        `;
                        machineGrid.insertAdjacentHTML('beforeend', mCard);
                    }
                });
            }
            document.getElementById('productDetailModal').classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }

        function closeProductDetailModal() {
            document.getElementById('productDetailModal').classList.add('hidden');
            document.body.style.overflow = '';
        }

        function openImageLightbox(src, caption) {
            const lb = document.getElementById('imageLightbox');
            document.getElementById('lightboxImg').src = src;
            document.getElementById('lightboxCaption').textContent = caption || '';
            lb.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
        function closeImageLightbox() {
            document.getElementById('imageLightbox').classList.add('hidden');
            document.body.style.overflow = '';
        }
        // Close modals with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeImageLightbox();
                closeProductDetailModal();
                closeMachineDetailModal();
            }
        });

        function getBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
            });
        }

        async function submitAddProduct(e) {
            e.preventDefault();
            const id = document.getElementById('ap_id').value;
            if(db.products.some(p => p.id == id)) { showToast('รหัสสินค้านี้มีอยู่ในระบบแล้ว! โปรดใช้รหัสอื่น', 'error'); return; }
            
            let base64 = null;
            if (document.getElementById('ap_image').files.length > 0) base64 = await getBase64(document.getElementById('ap_image').files[0]);

            let noteVal = document.getElementById('ap_note').value;
            if (document.getElementById('ap_is_cancelled').checked) {
                if (noteVal) {
                    if (!noteVal.includes('ยกเลิกใช้')) {
                        noteVal = (noteVal + '\nยกเลิกใช้').trim();
                    }
                } else {
                    noteVal = 'ยกเลิกใช้';
                }
            }

            let payload = { 
                id: id, name: document.getElementById('ap_name').value, unit: document.getElementById('ap_unit').value, 
                cost: document.getElementById('ap_cost').value, category: document.getElementById('ap_cat').value, 
                note: noteVal, imageBase64: base64,
                price_a: document.getElementById('ap_price_a').value,
                price_b: document.getElementById('ap_price_b').value,
                price_c: document.getElementById('ap_price_c').value,
                stock_qty: document.getElementById('ap_stock_qty').value || 0,
                group: document.getElementById('ap_group').value.trim(),
                supplier: document.getElementById('ap_supplier').value.trim(),
                storage: document.getElementById('ap_storage').value.trim()
            };

            showLoading('กำลังบันทึกข้อมูลและอัปโหลดรูป (อาจใช้เวลาสักครู่)...');
            try {
                let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'addProduct', payload: payload }) });
                let result = await res.json();
                if(result.status === 'success') { showToast('เพิ่มสินค้าเข้าระบบเรียบร้อย'); document.getElementById('formAddProduct').reset(); fetchData(); }
                else showToast('เกิดข้อผิดพลาด: ' + result.message, 'error');
            } catch (err) { showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error'); }
            hideLoading();
        }

        // ===== RESTOCK PRODUCT LOGIC =====
        function legacy_initRestockView() {
            document.getElementById('formRestockProduct').reset();
            document.getElementById('restock_product_id').value = '';
            document.getElementById('restock_product_detail').classList.add('hidden');
            
            if (isLoggedIn && currentUser) {
                document.getElementById('restock_operator').value = currentUser.fullName || '';
            }
        }

        function openRestockProductSelect() {
            const dropdown = document.getElementById('dropdown_restock_product');
            dropdown.classList.remove('hidden');
            renderRestockProductSelect(true);
        }

        function filterRestockProductSelect() {
            const dropdown = document.getElementById('dropdown_restock_product');
            dropdown.classList.remove('hidden');
            renderRestockProductSelect(false);
        }

        function renderRestockProductSelect(forceShowAll = false) {
            const inputVal = document.getElementById('restock_product_input').value.toLowerCase();
            const keywords = forceShowAll ? [] : inputVal.split(/\s+/).filter(k => k.length > 0);
            const dropdown = document.getElementById('dropdown_restock_product');
            dropdown.innerHTML = '';
            
            let matchCount = 0;
            const displayLimit = 50;
            
            const productsList = [...db.products];
            productsList.sort((a, b) => String(a.name).localeCompare(String(b.name)));
            
            productsList.forEach(p => {
                const textToSearch = `${p.id} ${p.name}`.toLowerCase();
                const isMatch = keywords.every(kw => textToSearch.includes(kw));
                
                if (keywords.length === 0 || isMatch) {
                    if (matchCount < displayLimit) {
                        const stock = p.stock_qty || 0;
                        const unit = p.unit || 'ชิ้น';
                        dropdown.insertAdjacentHTML('beforeend', `
                            <div class="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 transition flex justify-between items-center text-gray-700" 
                                 onclick="selectRestockProductOption('${escapeForJS(p.id)}', '${escapeForJS(p.name)}', ${stock}, '${escapeForJS(unit)}')">
                                <div>
                                    <span class="font-bold text-blue-700">${escapeHTML(p.id)}</span> - <span>${escapeHTML(p.name)}</span>
                                </div>
                                <span class="text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">คงเหลือ ${stock} ${unit}</span>
                            </div>
                        `);
                    }
                    matchCount++;
                }
            });
            
            if (matchCount > displayLimit) {
                dropdown.insertAdjacentHTML('beforeend', `<div class="px-4 py-2 text-center bg-amber-50 text-xs text-amber-600 font-medium border-t border-amber-100"><i class="fa-solid fa-info-circle mr-1"></i>พบอีก ${matchCount - displayLimit} รายการ — พิมพ์เพิ่มเพื่อค้นหา</div>`);
            }
            if (matchCount === 0 && keywords.length > 0) {
                dropdown.insertAdjacentHTML('beforeend', `<div class="px-4 py-3 text-gray-400 text-sm text-center">ไม่พบอะไหล่ที่ค้นหา</div>`);
            }
        }

        function selectRestockProductOption(id, name, stock, unit) {
            document.getElementById('restock_product_id').value = id;
            document.getElementById('restock_product_input').value = `${id} - ${name}`;
            document.getElementById('dropdown_restock_product').classList.add('hidden');
            
            document.getElementById('rst_prod_id').innerText = id;
            document.getElementById('rst_prod_name').innerText = name;
            document.getElementById('rst_prod_stock').innerText = `${stock} ${unit}`;
            document.getElementById('restock_product_detail').classList.remove('hidden');
        }

        async function submitRestockProduct(e) {
            e.preventDefault();
            const productId = document.getElementById('restock_product_id').value;
            const qty = parseFloat(document.getElementById('restock_qty').value);
            const operator = document.getElementById('restock_operator').value.trim();
            const note = document.getElementById('restock_note').value.trim();
            
            if (!productId) {
                showToast("กรุณาเลือกอะไหล่ที่ต้องการเติมสต็อก", "error");
                return;
            }
            if (isNaN(qty) || qty <= 0) {
                showToast("จำนวนที่เติมต้องมากกว่า 0", "error");
                return;
            }
            
            const payload = {
                id: productId,
                qty: qty,
                requester: operator,
                department: "สโตร์ (Restock)",
                note: note
            };
            
            showLoading('กำลังบันทึกข้อมูลการเติมสต็อก...');
            try {
                let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'restockProduct', payload: payload }) });
                let result = await res.json();
                if (result.status === 'success') {
                    showToast('เติมสต็อกสำเร็จเรียบร้อย');
                    document.getElementById('formRestockProduct').reset();
                    document.getElementById('restock_product_id').value = '';
                    document.getElementById('restock_product_detail').classList.add('hidden');
                    await fetchData(false);
                } else {
                    showToast('เกิดข้อผิดพลาด: ' + result.message, 'error');
                }
            } catch (err) {
                showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อเติมสต็อกได้', 'error');
            }
            hideLoading();
        }

        function openEditProductModal(id) {
            const p = db.products.find(x => x.id == id);
            if(!p) return;
            document.getElementById('ep_id').value = p.id; document.getElementById('ep_id_display').value = p.id;
            document.getElementById('ep_name').value = p.name || ''; document.getElementById('ep_unit').value = p.unit || '';
            document.getElementById('ep_cost').value = p.cost || ''; document.getElementById('ep_cat').value = p.category || '';
            document.getElementById('ep_group').value = p.group || '';
            document.getElementById('ep_supplier').value = p.supplier || '';
            document.getElementById('ep_storage').value = p.storage || '';
            document.getElementById('ep_price_a').value = p.price_a || '';
            document.getElementById('ep_price_b').value = p.price_b || '';
            document.getElementById('ep_price_c').value = p.price_c || '';
            document.getElementById('ep_note').value = p.note || ''; document.getElementById('ep_image').value = ''; 
            document.getElementById('ep_stock_qty').value = p.stock_qty || 0;
            
            const isCancelled = p.note && (p.note.trim() === 'ยกเลิกใช้' || p.note.includes('ยกเลิกใช้'));
            document.getElementById('ep_is_cancelled').checked = isCancelled;

            document.getElementById('editProductModal').classList.remove('hidden');
        }

        function closeEditProductModal() { document.getElementById('editProductModal').classList.add('hidden'); }

        async function submitEditProduct(e) {
            e.preventDefault();
            let base64 = null;
            if (document.getElementById('ep_image').files.length > 0) base64 = await getBase64(document.getElementById('ep_image').files[0]);

            let noteVal = document.getElementById('ep_note').value;
            if (document.getElementById('ep_is_cancelled').checked) {
                if (noteVal) {
                    if (!noteVal.includes('ยกเลิกใช้')) {
                        noteVal = (noteVal + '\nยกเลิกใช้').trim();
                    }
                } else {
                    noteVal = 'ยกเลิกใช้';
                }
            } else {
                if (noteVal) {
                    noteVal = noteVal.replace('ยกเลิกใช้', '').trim();
                }
            }

            let payload = { 
                id: document.getElementById('ep_id').value, name: document.getElementById('ep_name').value, unit: document.getElementById('ep_unit').value, 
                cost: document.getElementById('ep_cost').value, category: document.getElementById('ep_cat').value, note: noteVal, imageBase64: base64,
                price_a: document.getElementById('ep_price_a').value,
                price_b: document.getElementById('ep_price_b').value,
                price_c: document.getElementById('ep_price_c').value,
                stock_qty: document.getElementById('ep_stock_qty').value || 0,
                group: document.getElementById('ep_group').value.trim(),
                supplier: document.getElementById('ep_supplier').value.trim(),
                storage: document.getElementById('ep_storage').value.trim()
            };

            showLoading('กำลังบันทึกการแก้ไขข้อมูล...');
            try {
                let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'editProduct', payload: payload }) });
                let result = await res.json();
                if(result.status === 'success') { showToast('บันทึกข้อมูลการแก้ไขเรียบร้อย'); closeEditProductModal(); fetchData(); } 
                else showToast('เกิดข้อผิดพลาด: ' + result.message, 'error');
            } catch (err) { showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error'); }
            hideLoading();
        }

        function openAddMachineModal() {
            document.getElementById('formAddMachine').reset();
            document.getElementById('am_image_preview_wrap').classList.add('hidden');
            document.getElementById('am_image_placeholder').classList.remove('hidden');
            document.getElementById('addMachineModal').classList.remove('hidden');
        }

        function closeAddMachineModal() { document.getElementById('addMachineModal').classList.add('hidden'); }

        function openEditMachineModal(id) {
            const m = db.machines.find(x => x.id == id);
            if(!m) return;
            document.getElementById('em_id').value = m.id;
            document.getElementById('em_id_display').value = m.id;
            document.getElementById('em_name').value = m.name || '';
            document.getElementById('em_group').value = m.group || '';
            document.getElementById('em_supplier').value = m.supplier || '';
            document.getElementById('em_storage').value = m.storage || '';
            document.getElementById('em_note').value = m.note || '';
            document.getElementById('em_cost').value = m.cost || '';
            document.getElementById('em_price_a').value = m.price_a || '';
            document.getElementById('em_price_b').value = m.price_b || '';
            document.getElementById('em_price_c').value = m.price_c || '';
            document.getElementById('em_image').value = '';
            
            if(m.image_url) {
                document.getElementById('em_image_preview').src = m.image_url;
                document.getElementById('em_image_filename').textContent = 'รูปภาพปัจจุบัน';
                document.getElementById('em_image_preview_wrap').classList.remove('hidden');
                document.getElementById('em_image_placeholder').classList.add('hidden');
            } else {
                document.getElementById('em_image_preview_wrap').classList.add('hidden');
                document.getElementById('em_image_placeholder').classList.remove('hidden');
            }
            document.getElementById('editMachineModal').classList.remove('hidden');
        }

        function closeEditMachineModal() { document.getElementById('editMachineModal').classList.add('hidden'); }

        function previewMachineImage(prefix) {
            const input = document.getElementById(prefix + '_image');
            const previewWrap = document.getElementById(prefix + '_image_preview_wrap');
            const placeholder = document.getElementById(prefix + '_image_placeholder');
            const preview = document.getElementById(prefix + '_image_preview');
            const filename = document.getElementById(prefix + '_image_filename');
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = e => {
                    preview.src = e.target.result;
                    filename.textContent = input.files[0].name;
                    previewWrap.classList.remove('hidden');
                    placeholder.classList.add('hidden');
                };
                reader.readAsDataURL(input.files[0]);
            }
        }

        async function submitAddMachine(e) {
            e.preventDefault();
            const id = document.getElementById('am_id').value.trim();
            const name = document.getElementById('am_name').value.trim();
            if (!id || !name) { showToast('กรุณากรอกรหัสและชื่อเครื่องจักร', 'error'); return; }
            if(db.machines.some(m => m.id == id)) { showToast('รหัสเครื่องจักรนี้มีอยู่แล้ว', 'error'); return; }
            
            let base64 = null;
            if (document.getElementById('am_image').files.length > 0) base64 = await getBase64(document.getElementById('am_image').files[0]);
            
            // แก้บัค 4: แปลง empty string เป็น 0 ก่อนส่งไปยัง GS เพื่อป้องกัน "" บันทึกลง Sheets
            let payload = {
                id: id, name: name, 
                note: document.getElementById('am_note').value,
                cost: parseFloat(document.getElementById('am_cost').value) || 0,
                price_a: parseFloat(document.getElementById('am_price_a').value) || 0,
                price_b: parseFloat(document.getElementById('am_price_b').value) || 0,
                price_c: parseFloat(document.getElementById('am_price_c').value) || 0,
                imageBase64: base64,
                group: document.getElementById('am_group').value.trim(),
                supplier: document.getElementById('am_supplier').value.trim(),
                storage: document.getElementById('am_storage').value.trim()
            };

            showLoading('กำลังบันทึกข้อมูลเครื่องจักร...');
            try {
                let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'addMachine', payload: payload }) });
                let result = await res.json();
                if(result.status === 'success') { showToast('เพิ่มเครื่องจักรเรียบร้อย'); closeAddMachineModal(); fetchData(); } 
                else showToast(result.message, 'error');
            } catch (err) { showToast('ข้อผิดพลาดเครือข่าย', 'error'); }
            hideLoading();
        }

        async function submitEditMachine(e) {
            e.preventDefault();
            const id = document.getElementById('em_id').value;
            const name = document.getElementById('em_name').value.trim();
            if (!name) { showToast('กรุณากรอกชื่อเครื่องจักร', 'error'); return; }
            
            let base64 = null;
            if (document.getElementById('em_image').files.length > 0) base64 = await getBase64(document.getElementById('em_image').files[0]);
            
            // แก้บัค 4: แปลง empty string เป็น 0 ก่อนส่งไปยัง GS เพื่อป้องกัน "" บันทึกลง Sheets
            let payload = {
                id: id, name: name, 
                note: document.getElementById('em_note').value,
                cost: parseFloat(document.getElementById('em_cost').value) || 0,
                price_a: parseFloat(document.getElementById('em_price_a').value) || 0,
                price_b: parseFloat(document.getElementById('em_price_b').value) || 0,
                price_c: parseFloat(document.getElementById('em_price_c').value) || 0,
                imageBase64: base64,
                group: document.getElementById('em_group').value.trim(),
                supplier: document.getElementById('em_supplier').value.trim(),
                storage: document.getElementById('em_storage').value.trim()
            };

            showLoading('กำลังบันทึกการแก้ไขข้อมูล...');
            try {
                let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'editMachine', payload: payload }) });
                let result = await res.json();
                if(result.status === 'success') { showToast('บันทึกข้อมูลเครื่องจักรเรียบร้อย'); closeEditMachineModal(); fetchData(); } 
                else showToast('เกิดข้อผิดพลาด: ' + result.message, 'error');
            } catch (err) { showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error'); }
            hideLoading();
        }

        function renderMachineTable() {
            const tbody = document.getElementById('machineTableBody');
            const countEl = document.getElementById('machineCount');
            const searchKeywordString = document.getElementById('searchMachine') ? document.getElementById('searchMachine').value.toLowerCase() : '';
            const searchKeywords = searchKeywordString.split(/\s+/).filter(k => k.length > 0);
            tbody.innerHTML = '';
            
            let filteredMachines = db.machines;
            if (searchKeywords.length > 0) {
                filteredMachines = filteredMachines.filter(m => {
                    const textToSearch = `${m.id} ${m.name} ${m.group || ''} ${m.supplier || ''} ${m.storage || ''}`.toLowerCase();
                    return searchKeywords.every(kw => textToSearch.includes(kw));
                });
            }
            
            if(countEl) countEl.textContent = filteredMachines.length + ' รายการ';
            
            if(filteredMachines.length === 0) {
                tbody.innerHTML = `<tr><td colspan="9" class="p-10 text-center text-gray-400"><i class="fa-solid fa-industry text-4xl mb-3 opacity-30 block"></i>ไม่พบข้อมูลเครื่องจักรที่ค้นหา</td></tr>`;
                return;
            }
            
            filteredMachines.forEach(m => {
                const imgSrc = m.image_url || 'https://placehold.co/80x80/f1f5f9/94a3b8?text=No+Img';
                let tr = `
                    <tr class="hover:bg-slate-50/80 transition-colors duration-150 border-b border-gray-100 last:border-0">
                        <td class="p-3 text-center">
                            <img src="${escapeHTML(imgSrc)}" alt="${escapeHTML(m.name)}" class="w-14 h-14 object-cover rounded-xl shadow-sm border border-gray-200 bg-white mx-auto" onerror="this.src='https://placehold.co/80x80/f1f5f9/94a3b8?text=Err'">
                        </td>
                        <td class="p-4 font-semibold text-gray-800 whitespace-nowrap">${escapeHTML(m.id)}</td>
                        <td class="p-4 text-gray-600">${escapeHTML(m.name)}</td>
                        <td class="p-4 text-gray-500 max-w-[150px] truncate" title="${escapeHTML(m.note)}">${escapeHTML(m.note || '-')}</td>
                        <td class="p-4 text-red-600 font-medium text-right">${fNumber(m.cost, 0)}</td>
                        <td class="p-4 text-blue-600 font-bold text-right">${fNumber(m.price_a, 0)}</td>
                        <td class="p-4 text-green-600 font-bold text-right">${fNumber(m.price_b, 0)}</td>
                        <td class="p-4 text-orange-600 font-bold text-right">${fNumber(m.price_c, 0)}</td>
                        <td class="p-4 text-center">
                            <div class="flex items-center justify-center gap-2">
                                <button onclick="openEditMachineModal('${escapeForJS(m.id)}')" class="text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 px-3 py-2 rounded-lg text-xs font-medium transition shadow-sm inline-flex items-center gap-1.5" title="แก้ไขข้อมูล"><i class="fa-solid fa-edit"></i><span class="hidden sm:inline">แก้ไข</span></button>
                                <button onclick="requestDeleteMachine('${escapeForJS(m.id)}')" class="text-red-500 hover:text-white bg-red-50 hover:bg-red-600 px-3 py-2 rounded-lg text-xs font-medium transition shadow-sm inline-flex items-center gap-1.5" title="ลบเครื่องจักร"><i class="fa-solid fa-trash-alt"></i><span class="hidden sm:inline">ลบ</span></button>
                            </div>
                        </td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', tr);
            });
        }

        function initMappingView() {
            selectedMappingProducts.clear();
            currentSelectedMachineForMapping = '';
            document.getElementById('map_machine_search').value = '';
            document.getElementById('map_product_search').value = '';
            const sugg = document.getElementById('machine_suggestions');
            if (sugg) sugg.classList.add('hidden');
            currentMapProductPage = 1;
            updateMappingSubmitButton(); // Sync button state to disabled on load
            filterMapMachines(); 
        }

        function showMachineSuggestions() { document.getElementById('machine_suggestions').classList.remove('hidden'); filterMapMachines(); }
        function hideMachineSuggestions() { setTimeout(() => { const sugg = document.getElementById('machine_suggestions'); if(sugg) sugg.classList.add('hidden'); }, 200); }

        function filterMapMachines() {
            const keywordString = document.getElementById('map_machine_search').value.toLowerCase();
            const keywords = keywordString.split(/\s+/).filter(k => k.length > 0);
            const selMach = document.getElementById('map_machine');
            const suggContainer = document.getElementById('machine_suggestions');
            const currentVal = selMach.value;
            
            selMach.innerHTML = '<option value="">-- เครื่องจักรที่เลือกจะแสดงที่นี่ --</option>';
            if (suggContainer) suggContainer.innerHTML = '';
            
            let foundCurrent = false;
            let matchCount = 0;
            let renderCount = 0;
            const maxSugg = 50;
            
            db.machines.forEach(m => {
                const textToSearch = `${m.id} ${m.name}`.toLowerCase();
                const isMatch = keywords.every(kw => textToSearch.includes(kw));
                
                if (keywords.length === 0 || isMatch) {
                    selMach.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(m.id)}">${escapeHTML(m.id)} : ${escapeHTML(m.name)}</option>`);
                    if (m.id == currentVal) foundCurrent = true;
                    
                    if (suggContainer && renderCount < maxSugg) {
                        let suggHtml = `
                        <div class="p-3 hover:bg-purple-50 cursor-pointer border-b border-gray-100 last:border-0 transition" 
                             onclick="selectMachineFromSuggestion('${escapeForJS(m.id)}', '${escapeForJS(m.name)}')">
                            <span class="font-bold text-purple-700">${escapeHTML(m.id)}</span> : <span class="text-gray-700">${escapeHTML(m.name)}</span>
                        </div>`;
                        suggContainer.insertAdjacentHTML('beforeend', suggHtml);
                        renderCount++;
                    }
                    matchCount++;
                }
            });
            if (foundCurrent) selMach.value = currentVal;
            if (suggContainer) {
                if (matchCount === 0) suggContainer.innerHTML = '<div class="p-3 text-gray-400 text-sm text-center">ไม่พบเครื่องจักรที่ค้นหา</div>';
                else if (matchCount > maxSugg) suggContainer.insertAdjacentHTML('beforeend', `<div class="p-2 text-center bg-amber-50 text-xs text-amber-600 border-t border-amber-100">พบอีก ${matchCount - maxSugg} เครื่อง — พิมพ์ชื่อเพื่อค้นหา</div>`);
            }
        }

        function selectMachineFromSuggestion(id, name) {
            document.getElementById('map_machine_search').value = id + ' ' + name;
            const selMach = document.getElementById('map_machine');
            selMach.innerHTML = `<option value="${escapeHTML(id)}">${escapeHTML(id)} : ${escapeHTML(name)}</option>`;
            selMach.value = id;
            const suggContainer = document.getElementById('machine_suggestions');
            if(suggContainer) suggContainer.classList.add('hidden');
            onMachineSelected();
        }

        function onMachineSelected() {
            const machineId = document.getElementById('map_machine').value;
            const prodSection = document.getElementById('map_products_section');
            if (machineId !== currentSelectedMachineForMapping) { selectedMappingProducts.clear(); currentSelectedMachineForMapping = machineId; }
            currentMapProductPage = 1;
            updateMappingSubmitButton();
            if (machineId) { prodSection.classList.remove('hidden'); filterMapProducts(); } 
            else { prodSection.classList.add('hidden'); }
        }

        function filterMapProducts() {
            const keywordString = document.getElementById('map_product_search').value.toLowerCase();
            const keywords = keywordString.split(/\s+/).filter(k => k.length > 0);
            const selectedCategory = document.getElementById('map_category_filter').value;
            
            const list = document.getElementById('map_product_list');
            const machineId = document.getElementById('map_machine').value;
            
            list.innerHTML = '';
            const alreadyMapped = new Set(db.mappings.filter(m => m.machine_id == machineId).map(m => String(m.product_id)));
            
            let filteredProducts = db.products.filter(p => {
                const isCancelled = p.note && (p.note.trim() === 'ยกเลิกใช้' || p.note.includes('ยกเลิกใช้'));
                if (isCancelled) return false;
                const textToSearch = `${p.id} ${p.name}`.toLowerCase();
                const isMatchKeyword = keywords.every(kw => textToSearch.includes(kw));
                const isMatchCategory = selectedCategory === 'all' || p.category === selectedCategory;
                return (keywords.length === 0 || isMatchKeyword) && isMatchCategory;
            });

            if (filteredProducts.length === 0) {
                list.innerHTML = `<div class="p-8 text-center text-gray-400"><i class="fa-solid fa-box-open text-3xl mb-3 opacity-50"></i><br>ไม่พบอะไหล่ที่ค้นหา หรือในหมวดหมู่นี้</div>`;
                renderMapProductPagination(0);
                return;
            }

            const totalItems = filteredProducts.length;
            const totalPages = Math.ceil(totalItems / MAP_PRODUCT_LIMIT);
            
            if (currentMapProductPage > totalPages) currentMapProductPage = totalPages;
            if (currentMapProductPage < 1) currentMapProductPage = 1;
            
            const startIndex = (currentMapProductPage - 1) * MAP_PRODUCT_LIMIT;
            const endIndex = startIndex + MAP_PRODUCT_LIMIT;
            const pageProducts = filteredProducts.slice(startIndex, endIndex);

            pageProducts.forEach(p => {
                const isAlreadyMapped = alreadyMapped.has(String(p.id));
                const isSelected = selectedMappingProducts.has(String(p.id));
                
                let html = `
                    <label class="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:bg-slate-50 transition cursor-pointer ${isAlreadyMapped ? 'opacity-60 bg-slate-50' : ''}">
                        <input type="checkbox" value="${escapeHTML(p.id)}" 
                            ${isAlreadyMapped ? 'disabled checked' : (isSelected ? 'checked' : '')} 
                            onchange="toggleMapProduct('${escapeForJS(p.id)}', this.checked)"
                            class="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500 disabled:bg-gray-200 disabled:border-gray-300 transition cursor-pointer disabled:cursor-not-allowed">
                        <img src="${escapeHTML(p.image_url || 'https://placehold.co/100x100?text=NoImg')}" class="w-10 h-10 object-cover rounded-lg shadow-sm bg-white" onerror="this.src='https://placehold.co/100x100?text=Err'">
                        <div class="flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 overflow-hidden">
                            <span class="font-bold text-gray-800 sm:w-32 truncate" title="${escapeHTML(p.id)}">${escapeHTML(p.id)}</span>
                            <span class="text-gray-600 flex-1 truncate text-sm" title="${escapeHTML(p.name)}">${escapeHTML(p.name)}</span>
                            <span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded border border-gray-200 whitespace-nowrap hidden md:inline-block">${escapeHTML(p.category || '-')}</span>
                            ${isAlreadyMapped ? `
                                <div class="flex items-center gap-2 whitespace-nowrap">
                                    <span class="text-[11px] bg-green-100 text-green-700 px-2.5 py-1 rounded-lg font-bold"><i class="fa-solid fa-check mr-1"></i> จับคู่แล้ว</span>
                                    <button type="button" onclick="event.stopPropagation(); event.preventDefault(); requestDeleteMappingFromForm('${escapeForJS(p.id)}', '${escapeForJS(machineId)}')" class="text-red-500 hover:text-white hover:bg-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 transition text-[11px] font-semibold flex items-center gap-1">
                                        <i class="fa-solid fa-unlink"></i> ยกเลิกจับคู่
                                    </button>
                                </div>` : ''}
                        </div>
                    </label>
                `;
                list.insertAdjacentHTML('beforeend', html);
            });

            renderMapProductPagination(totalPages);
        }

        function toggleMapProduct(productId, isChecked) {
            if (isChecked) selectedMappingProducts.add(productId);
            else selectedMappingProducts.delete(productId);
            updateMappingSubmitButton();
        }

        function selectAllMapProducts() {
            const checkboxes = document.querySelectorAll('#map_product_list input[type="checkbox"]:not(:disabled)');
            let allChecked = true;
            checkboxes.forEach(cb => { if (!cb.checked) allChecked = false; });
            checkboxes.forEach(cb => { cb.checked = !allChecked; if (cb.checked) selectedMappingProducts.add(cb.value); else selectedMappingProducts.delete(cb.value); });
            updateMappingSubmitButton();
        }

        function updateMappingSubmitButton() {
            document.getElementById('map_selected_count').innerText = selectedMappingProducts.size;
            const btnSubmit = document.getElementById('btn_submit_mapping');
            if (selectedMappingProducts.size > 0) {
                btnSubmit.disabled = false; btnSubmit.classList.remove('opacity-50', 'cursor-not-allowed'); btnSubmit.classList.add('hover:bg-purple-700', 'shadow-purple-600/30');
            } else {
                btnSubmit.disabled = true; btnSubmit.classList.add('opacity-50', 'cursor-not-allowed'); btnSubmit.classList.remove('hover:bg-purple-700', 'shadow-purple-600/30');
            }
        }

        async function submitAddMapping(e) {
            e.preventDefault();
            const mid = document.getElementById('map_machine').value;
            if(!mid || selectedMappingProducts.size === 0) { showToast('กรุณาเลือกเครื่องจักรและเลือกอะไหล่อย่างน้อย 1 รายการ', 'error'); return; }
            const pids = Array.from(selectedMappingProducts); 
            showLoading(`กำลังบันทึกการจับคู่อะไหล่ ${pids.length} รายการ...`);
            try {
                let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'addMapping', payload: { product_ids: pids, machine_id: mid } }) });
                let result = await res.json();
                if(result.status === 'success') { 
                    showToast('บันทึกการจับคู่อะไหล่เรียบร้อย'); 
                    selectedMappingProducts.clear();
                    updateMappingSubmitButton();
                    filterMapProducts();
                    fetchData(); 
                } 
                else showToast(result.message, 'error');
            } catch (err) { showToast('เกิดข้อผิดพลาดเครือข่าย', 'error'); }
            hideLoading();
        }

        function renderEditProductTable() {
            const tbody = document.getElementById('editProductTableBody');
            const searchKeywordString = document.getElementById('searchEditProduct').value.toLowerCase();
            const searchKeywords = searchKeywordString.split(/\s+/).filter(k => k.length > 0);
            tbody.innerHTML = '';

            let filteredProducts = db.products;
            if (searchKeywords.length > 0) {
                filteredProducts = filteredProducts.filter(p => {
                    const textToSearch = `${p.id} ${p.name} ${p.group || ''} ${p.supplier || ''} ${p.storage || ''}`.toLowerCase();
                    return searchKeywords.every(kw => textToSearch.includes(kw));
                });
            }
            if (filteredProducts.length === 0) { tbody.innerHTML = `<tr><td colspan="12" class="p-8 text-center text-gray-500">ไม่พบรายการอะไหล่ที่ค้นหา</td></tr>`; return; }

            filteredProducts.forEach((p, index) => {
                const costVal = parseFloat(String(p.cost).replace(/,/g, '')) || 0;
                const costStr = costVal.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                const pA = fNumberM(p.price_a, costVal * 2.1);
                const pB = fNumberM(p.price_b, costVal * 1.7);
                const pC = fNumberM(p.price_c, costVal * 1.3);
                
                const isCancelled = p.note && (p.note.trim() === 'ยกเลิกใช้' || p.note.includes('ยกเลิกใช้'));

                let tr = `
                    <tr class="hover:bg-blue-50/30 border-b border-gray-200 transition ${isCancelled ? 'bg-red-50/10' : ''}">
                        <td class="p-4 text-center text-gray-500">${index + 1}</td>
                        <td class="p-3"><img src="${escapeHTML(p.image_url || 'https://placehold.co/100x100?text=NoImg')}" class="w-12 h-12 object-cover rounded-lg shadow-sm border border-gray-200 bg-white ${isCancelled ? 'opacity-50 grayscale' : ''}" onerror="this.src='https://placehold.co/100x100?text=Err'"></td>
                        <td class="p-4 font-semibold ${isCancelled ? 'text-gray-400 line-through decoration-red-500' : 'text-gray-800'}">${escapeHTML(p.id)}</td>
                        <td class="p-4 ${isCancelled ? 'text-gray-400 line-through decoration-red-500' : 'text-gray-700'} max-w-xs truncate" title="${escapeHTML(p.name)}">${escapeHTML(p.name)}</td>
                        <td class="p-4 text-gray-600">${escapeHTML(p.unit || '-')}</td>
                        <td class="p-4 text-red-600 font-medium text-right">${costStr}</td>
                        <td class="p-4 text-blue-600 font-bold text-right">${pA}</td>
                        <td class="p-4 text-green-600 font-bold text-right">${pB}</td>
                        <td class="p-4 text-orange-600 font-bold text-right">${pC}</td>
                        <td class="p-4 text-center font-bold text-slate-700">${p.stock_qty || 0}</td>
                        <td class="p-4 text-center">
                            <label class="inline-flex items-center cursor-pointer select-none">
                                <input type="checkbox" ${isCancelled ? 'checked' : ''} onchange="toggleProductCancelStatus('${escapeForJS(p.id)}', this.checked)" class="w-5 h-5 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer transition-all">
                            </label>
                        </td>
                        <td class="p-4 text-center">
                            <div class="flex items-center justify-center gap-2">
                                <button onclick="openEditProductModal('${escapeForJS(p.id)}')" class="text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 px-3 py-2 rounded-lg text-xs font-medium transition shadow-sm inline-flex items-center" title="แก้ไขข้อมูล"><i class="fa-solid fa-edit"></i> <span class="hidden xl:inline ml-1.5">แก้ไข</span></button>
                                <button onclick="requestDeleteProduct('${escapeForJS(p.id)}')" class="text-red-600 hover:text-white bg-red-50 hover:bg-red-600 px-3 py-2 rounded-lg text-xs font-medium transition shadow-sm inline-flex items-center" title="ลบข้อมูล"><i class="fa-solid fa-trash-alt"></i> <span class="hidden xl:inline ml-1.5">ลบ</span></button>
                            </div>
                        </td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', tr);
            });
        }

        function renderMappingTable() {
            const tbody = document.getElementById('editMappingTableBody');
            const searchInput = document.getElementById('searchMapping');
            const machineFilter = document.getElementById('filterMappingMachine');
            
            const searchKeywordString = searchInput ? searchInput.value.toLowerCase() : '';
            const searchKeywords = searchKeywordString.split(/\s+/).filter(k => k.length > 0);
            const selectedMachine = machineFilter ? machineFilter.value : 'all';
            
            tbody.innerHTML = '';
            
            let filteredMappings = db.mappings.filter(m => {
                const p = db.products.find(prod => prod.id == m.product_id);
                const pName = p ? String(p.name).toLowerCase() : '';
                const pId = String(m.product_id).toLowerCase();
                const textToSearch = `${pId} ${pName}`;
                
                const matchSearch = searchKeywords.length === 0 || searchKeywords.every(kw => textToSearch.includes(kw));
                const matchMachine = selectedMachine === 'all' || m.machine_id == selectedMachine;
                return matchSearch && matchMachine;
            });
            if (filteredMappings.length === 0) { tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-gray-500">ไม่พบรายการจับคู่ที่ตรงกับเงื่อนไขการค้นหา</td></tr>`; return; }

            filteredMappings.forEach((m, index) => {
                const pName = db.products.find(p => p.id == m.product_id)?.name || 'ไม่พบชื่อสินค้า';
                const mName = db.machines.find(mac => mac.id == m.machine_id)?.name || 'ไม่พบชื่อเครื่องจักร';
                let tr = `
                    <tr class="hover:bg-slate-50 transition border-b border-gray-100 last:border-0">
                        <td class="p-4 text-center text-gray-500">${index + 1}</td>
                        <td class="p-4"><div class="font-bold text-blue-600">${escapeHTML(m.product_id)}</div><div class="text-sm text-gray-500 mt-0.5">${escapeHTML(pName)}</div></td>
                        <td class="p-4"><div class="font-bold text-green-600">${escapeHTML(m.machine_id)}</div><div class="text-sm text-gray-500 mt-0.5">${escapeHTML(mName)}</div></td>
                        <td class="p-4 text-center"><button onclick="requestDeleteMapping('${escapeForJS(m.product_id)}', '${escapeForJS(m.machine_id)}')" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2.5 rounded-full transition shadow-sm" title="ยกเลิกการจับคู่"><i class="fa-solid fa-unlink"></i></button></td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', tr);
            });
        }

        // แก้บัค 5: เพิ่มการเช็ค response status ใน delete functions ทั้งหมด
        function requestDeleteMachine(id) {
            confirmAction(`ยืนยันการลบเครื่องจักรรหัส "${id}" ใช่หรือไม่?\nการกระทำนี้จะลบประวัติการจับคู่อะไหล่ที่ผูกกับเครื่องจักรนี้ทั้งหมดด้วย`, async () => {
                showLoading('กำลังลบข้อมูลระบบ...');
                try {
                    let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteMachine', payload: { id: id } }) });
                    let result = await res.json();
                    if (result.status === 'success') { showToast('ลบเครื่องจักรสำเร็จ'); fetchData(); }
                    else { showToast('เกิดข้อผิดพลาด: ' + result.message, 'error'); hideLoading(); }
                } catch (e) { showToast('เกิดข้อผิดพลาด', 'error'); hideLoading(); }
            });
        }

        function requestDeleteProduct(id) {
            confirmAction(`ยืนยันการลบอะไหล่รหัส "${id}" ใช่หรือไม่?\nคำเตือน: การลบนี้จะไม่สามารถกู้คืนข้อมูลได้`, async () => {
                showLoading('กำลังลบสินค้าออกจากระบบ...');
                try {
                    let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteProduct', payload: { id: id } }) });
                    let result = await res.json();
                    if (result.status === 'success') { showToast('ลบสินค้าสำเร็จ'); fetchData(); }
                    else { showToast('เกิดข้อผิดพลาด: ' + result.message, 'error'); hideLoading(); }
                } catch (e) { showToast('เกิดข้อผิดพลาด', 'error'); hideLoading(); }
            });
        }

        function requestDeleteMapping(pid, mid) {
            confirmAction(`ยืนยันการยกเลิกการจับคู่ระหว่าง\nอะไหล่: ${pid}\nเครื่องจักร: ${mid}\nใช่หรือไม่?`, async () => {
                showLoading('กำลังยกเลิกการจับคู่...');
                try {
                    let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteMapping', payload: { product_id: pid, machine_id: mid } }) });
                    let result = await res.json();
                    if (result.status === 'success') { showToast('ยกเลิกการจับคู่สำเร็จ'); fetchData(); }
                    else { showToast('เกิดข้อผิดพลาด: ' + result.message, 'error'); hideLoading(); }
                } catch (e) { showToast('เกิดข้อผิดพลาด', 'error'); hideLoading(); }
            });
        }

        function requestDeleteMappingFromForm(pid, mid) {
            confirmAction(`ยืนยันการยกเลิกการจับคู่ระหว่าง\nอะไหล่: ${pid}\nเครื่องจักร: ${mid}\nใช่หรือไม่?`, async () => {
                showLoading('กำลังยกเลิกการจับคู่...');
                try {
                    let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteMapping', payload: { product_id: pid, machine_id: mid } }) });
                    let result = await res.json();
                    if (result.status === 'success') { 
                        showToast('ยกเลิกการจับคู่สำเร็จ');
                        
                        // ดึงข้อมูลใหม่เบื้องหลัง เพื่ออัปเดต db.mappings
                        const getRes = await fetch(API_URL + '?action=getAppData', { method: 'GET' });
                        if (getRes.ok) {
                            const data = await getRes.json();
                            if (data && Array.isArray(data.products)) {
                                db = data;
                                try { localStorage.setItem(LS_CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch(e) {}
                            }
                        }
                        
                        // รีเรนเดอร์ลิสต์ทันทีโดยไม่เปลี่ยนเครื่องจักรที่เลือก
                        filterMapProducts();
                        // อัปเดตตารางหน้าดู/แก้ไขด้วย
                        renderMappingTable();
                    } else { 
                        showToast('เกิดข้อผิดพลาด: ' + result.message, 'error'); 
                    }
                } catch (e) { 
                    showToast('เกิดข้อผิดพลาด', 'error'); 
                }
                hideLoading();
            });
        }
        // ===== QR Code Generator Client Logic =====
        function toggleQRKeepAspect() {
            const keep = document.getElementById('qrKeepAspect').checked;
            if (keep) {
                const wInput = document.getElementById('qrWidthCm');
                const hInput = document.getElementById('qrHeightCm');
                if (wInput && hInput) {
                    hInput.value = wInput.value;
                }
            }
        }

        function onQRWidthChange() {
            const keepCheck = document.getElementById('qrKeepAspect');
            if (keepCheck && keepCheck.checked) {
                const wInput = document.getElementById('qrWidthCm');
                const hInput = document.getElementById('qrHeightCm');
                if (wInput && hInput) {
                    hInput.value = wInput.value;
                }
            }
        }

        function onQRHeightChange() {
            const keepCheck = document.getElementById('qrKeepAspect');
            if (keepCheck && keepCheck.checked) {
                const wInput = document.getElementById('qrWidthCm');
                const hInput = document.getElementById('qrHeightCm');
                if (wInput && hInput) {
                    wInput.value = hInput.value;
                }
            }
        }

        function setQRSizePreset(w, h) {
            const wInput = document.getElementById('qrWidthCm');
            const hInput = document.getElementById('qrHeightCm');
            const keepCheck = document.getElementById('qrKeepAspect');

            if (wInput) wInput.value = w;
            if (hInput) hInput.value = h;
            if (keepCheck) {
                keepCheck.checked = (w === h);
            }
        }

        function generateQRCodeModal(id) {
            const p = db.products.find(x => x.id == id);
            if (!p) return;
            
            document.getElementById('qrProductCode').innerText = p.id;
            document.getElementById('qrProductName').innerText = p.name || '';
            
            const canvas = document.getElementById('qrCodeCanvas');
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            new QRious({
                element: canvas,
                value: String(p.id),
                size: 300,
                level: 'H'
            });
            
            document.getElementById('qrCodeModal').classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }

        function closeQRCodeModal() {
            document.getElementById('qrCodeModal').classList.add('hidden');
            document.body.style.overflow = '';
        }

        function downloadQRCode() {
            const canvas = document.getElementById('qrCodeCanvas');
            if (!canvas) return;
            const pId = document.getElementById('qrProductCode').innerText;
            const url = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.download = `QR_${pId}.png`;
            link.href = url;
            link.click();
            showToast('ดาวน์โหลด QR Code สำเร็จ', 'success');
        }

        function printQRCode() {
            const canvas = document.getElementById('qrCodeCanvas');
            if (!canvas) return;
            const pId = document.getElementById('qrProductCode').innerText;
            const pName = document.getElementById('qrProductName').innerText;
            const imgUrl = canvas.toDataURL("image/png");

            const wCm = parseFloat(document.getElementById('qrWidthCm')?.value) || 5;
            const hCm = parseFloat(document.getElementById('qrHeightCm')?.value) || 5;
            
            const printWindow = window.open('', '_blank', 'width=600,height=600');
            if (!printWindow) {
                showToast('กรุณาอนุญาตป็อปอัปในเบราว์เซอร์ก่อน', 'error');
                return;
            }
            
            const doc = printWindow.document;
            doc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Print QR Code - ${pId}</title>
                    <style>
                        @page {
                            size: ${wCm}cm ${hCm}cm;
                            margin: 0;
                        }
                        * {
                            box-sizing: border-box;
                        }
                        html, body {
                            margin: 0;
                            padding: 0;
                            width: ${wCm}cm;
                            height: ${hCm}cm;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background: #fff;
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                        }
                        .label-container {
                            width: ${wCm}cm;
                            height: ${hCm}cm;
                            padding: 0.3cm;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            text-align: center;
                            overflow: hidden;
                            box-sizing: border-box;
                        }
                        .qr-img {
                            max-width: 100%;
                            max-height: calc(100% - 1.2cm);
                            object-fit: contain;
                        }
                        .code {
                            font-size: ${Math.min(18, Math.max(10, Math.round(wCm * 2.5)))}px;
                            font-weight: 800;
                            margin-top: 4px;
                            letter-spacing: 0.5px;
                            font-family: monospace;
                            color: #0f172a;
                            line-height: 1.1;
                        }
                        .name {
                            font-size: ${Math.min(12, Math.max(8, Math.round(wCm * 1.6)))}px;
                            color: #64748b;
                            margin-top: 2px;
                            max-width: 100%;
                            word-wrap: break-word;
                            line-height: 1.2;
                        }
                    </style>
                </head>
                <body>
                    <div class="label-container">
                        <img class="qr-img" src="${imgUrl}" />
                        <div class="code">${pId}</div>
                        <div class="name">${pName}</div>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            window.close();
                        }
                    <\/script>
                </body>
                </html>
            `);
            doc.close();
        }

// ===== Restock & Adjustment Excel Client Logic =====
function exportRestockToExcel() {
    const searchKeywordString = document.getElementById('searchRestockProduct')?.value.toLowerCase() || '';
    const searchKeywords = searchKeywordString.split(/\s+/).filter(k => k.length > 0);

    let filteredProducts = db.products || [];
    if (searchKeywords.length > 0) {
        filteredProducts = filteredProducts.filter(p => {
            const textToSearch = `${p.id} ${p.name} ${p.category || ''}`.toLowerCase();
            return searchKeywords.every(kw => textToSearch.includes(kw));
        });
    }

    if (!filteredProducts || filteredProducts.length === 0) {
        showToast('ไม่มีข้อมูลสำหรับส่งออก', 'error');
        return;
    }

    // Map to worksheet format
    const data = filteredProducts.map((p, index) => ({
        "ลำดับ": index + 1,
        "รหัสสินค้า": String(p.id),
        "ชื่อสินค้า": p.name || '',
        "หมวดหมู่": p.category || 'ทั่วไป',
        "หน่วยนับ": p.unit || '-',
        "สต็อกปัจจุบัน": p.stock_qty || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ยอดสต็อก");
    
    const max_width = data.reduce((w, r) => Math.max(w, r["ชื่อสินค้า"].length), 10);
    worksheet["!cols"] = [
        { wch: 6 },  // ลำดับ
        { wch: 15 }, // รหัสสินค้า
        { wch: Math.min(max_width + 4, 50) }, // ชื่อสินค้า
        { wch: 15 }, // หมวดหมู่
        { wch: 10 }, // หน่วยนับ
        { wch: 15 }  // สต็อกปัจจุบัน
    ];

    // Format numbers
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const stock_cell = XLSX.utils.encode_cell({c: 5, r: R}); // Column F is stock_qty (0-indexed: 5)
        if (worksheet[stock_cell]) {
            worksheet[stock_cell].t = 'n';
            worksheet[stock_cell].z = '#,##0';
        }
    }

    const dateStr = new Date().toLocaleDateString('th-TH').replace(/\//g, '-');
    XLSX.writeFile(workbook, `รายการอะไหล่และยอดคงเหลือ_${dateStr}.xlsx`);
    showToast('ส่งออกไฟล์ Excel เรียบร้อยแล้ว', 'success');
}

async function initRestockHistoryView() {
    showLoading('กำลังโหลดประวัติการปรับปรุงสต็อก...');
    try {
        let transRes = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getTransactions' }) });
        let result = await transRes.json();
        if (result.status === 'success') {
            transactions = result.data || [];
        }
    } catch (err) {
        console.error(err);
        showToast('ไม่สามารถดึงข้อมูลประวัติจากเซิร์ฟเวอร์ได้', 'error');
    }
    
    document.getElementById('restock_history_search').value = '';
    renderRestockHistoryTable();
    hideLoading();
}

function renderRestockHistoryTable() {
    const tbody = document.getElementById('restockHistoryTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const searchKeyword = document.getElementById('restock_history_search').value.toLowerCase();
    const keywords = searchKeyword.split(/\s+/).filter(k => k.length > 0);
    
    // Filter only for Manual Stock Adjustment transactions (excluding PO Receives)
    let restockTxs = transactions.filter(t => (t.status === 'Restock' || t.machine_id === 'RESTOCK') && t.machine_id !== 'PO_RECEIVE' && !(t.note && (t.note.startsWith("รับสินค้าจาก PO ") || t.note.startsWith("รับสินค้าfrom PO "))));
    
    let historyList = [];
    restockTxs.forEach(t => {
        if (t.items && t.items.length > 0) {
            const item = t.items[0];
            const prod = db.products.find(p => p.id == item.product_id);
            const prodName = prod ? prod.name : 'ไม่พบข้อมูลสินค้า';
            const unit = prod ? prod.unit : 'ชิ้น';
            
            historyList.push({
                productId: item.product_id,
                productName: prodName,
                qty: item.qty,
                unit: unit,
                operator: t.requester,
                note: t.note,
                date: t.date
            });
        }
    });
    
    if (keywords.length > 0) {
        historyList = historyList.filter(h => {
            const txt = `${h.productId} ${h.productName}`.toLowerCase();
            return keywords.every(kw => txt.includes(kw));
        });
    }
    
    if (historyList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-10 text-center text-gray-400">ไม่พบประวัติการปรับปรุงสต็อก</td></tr>`;
        return;
    }
    
    historyList.forEach((h, index) => {
        const modeLabel = h.note.includes("ปรับยอดสต็อกอะไหล่ (จาก") ? "กำหนดใหม่ (=)" : (h.qty > 0 ? "เติมสต็อก (+)" : "ปรับลด (-)");
        
        let modeClass = "bg-green-50 text-green-700 border-green-200";
        if (modeLabel === "ปรับลด (-)") {
            modeClass = "bg-red-50 text-red-700 border-red-200";
        } else if (modeLabel === "กำหนดใหม่ (=)") {
            modeClass = "bg-blue-50 text-blue-700 border-blue-200";
        }
        
        const absQty = Math.abs(h.qty);
        
        let tr = `
            <tr class="hover:bg-slate-50 transition border-b border-gray-100 last:border-0">
                <td class="p-4 text-center text-gray-500">${index + 1}</td>
                <td class="p-4 font-bold text-gray-900">${escapeHTML(h.productId)}</td>
                <td class="p-4 text-gray-700 max-w-xs truncate" title="${escapeHTML(h.productName)}">${escapeHTML(h.productName)}</td>
                <td class="p-4 text-center">
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold border ${modeClass}">
                        ${modeLabel}
                    </span>
                </td>
                <td class="p-4 text-center font-extrabold text-blue-600 text-base">${absQty.toLocaleString('th-TH')}</td>
                <td class="p-4 text-center text-gray-500">${escapeHTML(h.unit)}</td>
                <td class="p-4 text-gray-700 font-semibold">${escapeHTML(h.operator)}</td>
                <td class="p-4 text-gray-500 text-xs">${escapeHTML(h.note)}</td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', tr);
    });
}

function exportRestockHistoryToExcel() {
    const table = document.querySelector('#view-restock-history table');
    if (!table) return;
    
    const rows = table.querySelectorAll('tbody tr');
    const data = [];
    
    rows.forEach(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length < 8) return;
        
        data.push({
            "ลำดับ": cols[0].innerText.trim(),
            "รหัสสินค้า": cols[1].innerText.trim(),
            "ชื่อสินค้า": cols[2].innerText.trim(),
            "รูปแบบการปรับปรุงสต็อก": cols[3].innerText.trim(),
            "จำนวนที่ปรับปรุง": parseFloat(cols[4].innerText.trim().replace(/,/g, '')) || 0,
            "หน่วย": cols[5].innerText.trim(),
            "ผู้ดำเนินการ": cols[6].innerText.trim(),
            "หมายเหตุ": cols[7].innerText.trim()
        });
    });

    if (data.length === 0) {
        showToast('ไม่มีข้อมูลสำหรับส่งออก', 'error');
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ประวัติปรับปรุงสต็อก");
    
    const max_width = data.reduce((w, r) => Math.max(w, r["ชื่อสินค้า"].length), 10);
    worksheet["!cols"] = [
        { wch: 6 },  // ลำดับ
        { wch: 15 }, // รหัสสินค้า
        { wch: Math.min(max_width + 4, 50) }, // ชื่อสินค้า
        { wch: 25 }, // รูปแบบการปรับปรุงสต็อก
        { wch: 15 }, // จำนวนที่ปรับปรุง
        { wch: 10 }, // หน่วย
        { wch: 15 }, // ผู้ดำเนินการ
        { wch: 30 }  // หมายเหตุ
    ];

    // Format numbers
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const qty_cell = XLSX.utils.encode_cell({c: 4, r: R}); // Column E is qty (0-indexed: 4)
        if (worksheet[qty_cell]) {
            worksheet[qty_cell].t = 'n';
            worksheet[qty_cell].z = '#,##0';
        }
    }

    const dateStr = new Date().toLocaleDateString('th-TH').replace(/\//g, '-');
    XLSX.writeFile(workbook, `ประวัติการปรับปรุงสต็อกสินค้า_${dateStr}.xlsx`);
    showToast('ส่งออกไฟล์ Excel เรียบร้อยแล้ว', 'success');
}

        // ===== Report Analytics Client Logic =====
        async function initReportView() {
            showLoading('กำลังโหลดข้อมูลรายงาน...');
            try {
                let transRes = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getTransactions' }) });
                let result = await transRes.json();
                if (result.status === 'success') {
                    transactions = result.data || [];
                }
            } catch (err) {
                console.error(err);
                showToast('ไม่สามารถดึงข้อมูลประวัติการเบิกจ่ายมาทำรายงานได้', 'error');
            }
            
            buildReportFilterOptions();
            filterReport();
            hideLoading();
        }

        function buildReportFilterOptions() {
            // 1. Category Options
            const cats = [...new Set(db.products.map(p => p.category))].filter(c => c && c.trim() !== '').sort();
            window.reportCategories = cats;

            // 2. Machine Options
            const machs = db.machines.sort((a,b) => String(a.id).localeCompare(String(b.id)));
            window.reportMachines = machs;

            // 3. Requester Options
            const reqs = [...new Set(transactions.map(t => t.requester))].filter(r => r && r.trim() !== '').sort();
            window.reportRequesters = reqs;

            // 4. Year Options (Buddhist Era / BE)
            const yearSelect = document.getElementById('report_filter_year');
            const years = [...new Set(transactions.map(t => {
                if (t.date && t.date.length >= 4) {
                    const yr = parseInt(t.date.substring(0, 4));
                    if (!isNaN(yr)) return yr + 543;
                }
                return null;
            }))].filter(y => y !== null).sort((a, b) => b - a);

            yearSelect.innerHTML = '<option value="all">-- ทุกปี --</option>';
            years.forEach(y => {
                yearSelect.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
            });
        }

        function openReportSelect(type) {
            const dropdown = document.getElementById(`report_filter_${type}_dropdown`);
            dropdown.classList.remove('hidden');
            renderReportSelectOptions(type, true);
        }

        function filterReportSelect(type) {
            const dropdown = document.getElementById(`report_filter_${type}_dropdown`);
            dropdown.classList.remove('hidden');
            renderReportSelectOptions(type, false);
        }

        function renderReportSelectOptions(type, forceShowAll = false) {
            const input = document.getElementById(`report_filter_${type}_input`);
            const dropdown = document.getElementById(`report_filter_${type}_dropdown`);
            const val = forceShowAll ? '' : input.value.toLowerCase();
            const keywords = val.split(/\s+/).filter(k => k.length > 0);
            dropdown.innerHTML = '';

            let allText = '-- ทั้งหมด --';
            if (type === 'cat') allText = '-- ทุกหมวดหมู่อะไหล่ --';
            else if (type === 'mach') allText = '-- ทุกเครื่องจักร --';
            else if (type === 'req') allText = '-- ทุกคน --';
            else if (type === 'doc') allText = '-- ทุกเอกสาร --';

            dropdown.insertAdjacentHTML('beforeend', `
                <div class="px-4 py-2.5 hover:bg-slate-100 cursor-pointer border-b border-gray-100 font-bold bg-slate-50 text-gray-800" 
                     onclick="selectReportOption('${type}', 'all', '')">
                    ${allText}
                </div>
            `);

            let matchCount = 0;
            if (type === 'cat') {
                const cats = window.reportCategories || [];
                cats.forEach(c => {
                    if (keywords.length === 0 || keywords.every(k => c.toLowerCase().includes(k))) {
                        dropdown.insertAdjacentHTML('beforeend', `
                            <div class="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 transition text-gray-700" 
                                 onclick="selectReportOption('cat', '${escapeForJS(c)}', '${escapeForJS(c)}')">
                                ${escapeHTML(c)}
                            </div>
                        `);
                        matchCount++;
                    }
                });
            } else if (type === 'mach') {
                const machs = window.reportMachines || [];
                machs.forEach(m => {
                    const txt = `${m.id} ${m.name}`.toLowerCase();
                    if (keywords.length === 0 || keywords.every(k => txt.includes(k))) {
                        dropdown.insertAdjacentHTML('beforeend', `
                            <div class="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 transition text-gray-700" 
                                 onclick="selectReportOption('mach', '${escapeForJS(m.id)}', '${escapeForJS(m.id)} : ${escapeForJS(m.name)}')">
                                <span class="font-bold text-blue-700">${escapeHTML(m.id)}</span> : <span>${escapeHTML(m.name)}</span>
                            </div>
                        `);
                        matchCount++;
                    }
                });
            } else if (type === 'req') {
                const reqs = window.reportRequesters || [];
                reqs.forEach(r => {
                    if (keywords.length === 0 || keywords.every(k => r.toLowerCase().includes(k))) {
                        dropdown.insertAdjacentHTML('beforeend', `
                            <div class="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 transition text-gray-700" 
                                 onclick="selectReportOption('req', '${escapeForJS(r)}', '${escapeForJS(r)}')">
                                ${escapeHTML(r)}
                            </div>
                        `);
                        matchCount++;
                    }
                });
            } else if (type === 'doc') {
                const docs = getActiveDocumentIds();
                docs.forEach(d => {
                    if (keywords.length === 0 || keywords.every(k => d.toLowerCase().includes(k))) {
                        dropdown.insertAdjacentHTML('beforeend', `
                            <div class="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 transition text-gray-700 font-mono" 
                                 onclick="selectReportOption('doc', '${escapeForJS(d)}', '${escapeForJS(d)}')">
                                ${escapeHTML(d)}
                            </div>
                        `);
                        matchCount++;
                    }
                });
            }

            if (matchCount === 0 && keywords.length > 0) {
                dropdown.insertAdjacentHTML('beforeend', `<div class="px-4 py-3 text-gray-400 text-center">ไม่พบข้อมูลที่ค้นหา</div>`);
            }
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

        function getActiveDocumentIds() {
            const selectedMach = document.getElementById('report_filter_mach').value;
            const selectedReq = document.getElementById('report_filter_req').value;
            const selectedMonth = document.getElementById('report_filter_month').value;
            const selectedYear = document.getElementById('report_filter_year').value;
            const startDate = document.getElementById('report_filter_start_date').value;
            const endDate = document.getElementById('report_filter_end_date').value;

            let activeTx = transactions.filter(t => {
                if (t.status === 'Cancelled' || t.status === 'Restock') return false;
                if (selectedReq !== 'all' && t.requester !== selectedReq) return false;
                if (selectedMach !== 'all' && String(t.machine_id) !== String(selectedMach)) return false;
                
                if (t.date && t.date.length >= 10) {
                     const tDateOnly = t.date.substring(0, 10);
                     if (startDate && tDateOnly < startDate) return false;
                     if (endDate && tDateOnly > endDate) return false;
                     
                     if (selectedMonth !== 'all') {
                         const tMonth = t.date.substring(5, 7);
                         if (tMonth !== selectedMonth) return false;
                     }
                     
                     if (selectedYear !== 'all') {
                         const tYearAD = parseInt(t.date.substring(0, 4));
                         const tYearBE = tYearAD + 543;
                         if (String(tYearBE) !== String(selectedYear)) return false;
                     }
                }
                return true;
            });

            return [...new Set(activeTx.map(t => t.id))].sort((a, b) => b.localeCompare(a));
        }

        function selectReportOption(type, value, displayLabel) {
            document.getElementById(`report_filter_${type}`).value = value;
            document.getElementById(`report_filter_${type}_input`).value = displayLabel || '';
            document.getElementById(`report_filter_${type}_dropdown`).classList.add('hidden');
            filterReport();
        }

function filterReport(resetPage = true) {
    if (resetPage) {
        reportCurrentPage = 1;
    }

    const selectedMach = document.getElementById('report_filter_mach').value;
    const selectedReq = document.getElementById('report_filter_req').value;
    const selectedMonth = document.getElementById('report_filter_month').value;
    const selectedYear = document.getElementById('report_filter_year').value;
    const startDate = document.getElementById('report_filter_start_date').value;
    const endDate = document.getElementById('report_filter_end_date').value;
    const selectedDoc = document.getElementById('report_filter_doc').value;

    let activeTx = transactions.filter(t => {
        if (t.status === 'Cancelled' || t.status === 'Restock') return false;
        if (selectedReq !== 'all' && t.requester !== selectedReq) return false;
        if (selectedMach !== 'all' && String(t.machine_id) !== String(selectedMach)) return false;
        if (selectedDoc !== 'all' && t.id !== selectedDoc) return false;
        
        if (t.date && t.date.length >= 10) {
             const tDateOnly = t.date.substring(0, 10);
             if (startDate && tDateOnly < startDate) return false;
             if (endDate && tDateOnly > endDate) return false;
             
             if (selectedMonth !== 'all') {
                  const tMonth = t.date.substring(5, 7);
                  if (tMonth !== selectedMonth) return false;
             }
             
             if (selectedYear !== 'all') {
                  const tYearAD = parseInt(t.date.substring(0, 4));
                  const tYearBE = tYearAD + 543;
                  if (String(tYearBE) !== String(selectedYear)) return false;
             }
        }
        return true;
    });

    const productUsageMap = new Map();
    activeTx.forEach(t => {
        if (t.items && Array.isArray(t.items)) {
            t.items.forEach(item => {
                const pId = String(item.product_id);
                const currentQty = productUsageMap.get(pId) || 0;
                productUsageMap.set(pId, currentQty + parseFloat(item.qty || 0));
            });
        }
    });

    let productsToRender = db.products;
    const selectedCat = document.getElementById('report_filter_cat').value;
    if (selectedCat !== 'all') {
        productsToRender = productsToRender.filter(p => p.category === selectedCat);
    }

    const searchVal = document.getElementById('report_search_input').value.toLowerCase();
    const searchKeywords = searchVal.split(/\s+/).filter(k => k.length > 0);
    if (searchKeywords.length > 0) {
        productsToRender = productsToRender.filter(p => {
            const txt = `${p.id} ${p.name}`.toLowerCase();
            return searchKeywords.every(k => txt.includes(k));
        });
    }

    // Filter to show only items that have actually been withdrawn (qty > 0)
    productsToRender = productsToRender.filter(p => {
        const qty = productUsageMap.get(String(p.id)) || 0;
        return qty > 0;
    });

    // Save to global variables for export
    reportFilteredProducts = productsToRender;
    reportProductUsageMap = productUsageMap;

    let totalQtySum = 0;
    let totalCostSum = 0;
    let totalMidSum = 0;

    // Calculate sums based on ALL filtered products
    productsToRender.forEach(p => {
        const qty = productUsageMap.get(String(p.id)) || 0;
        const cost = parseFloat(String(p.cost).replace(/,/g, '')) || 0;
        const priceA = parseFloat(String(p.price_a).replace(/,/g, '')) || 0;

        totalQtySum += qty;
        totalCostSum += qty * cost;
        totalMidSum += qty * priceA;
    });

    // Pagination calculations
    const totalItems = productsToRender.length;
    const pageSize = 20;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    if (reportCurrentPage > totalPages) reportCurrentPage = totalPages;
    if (reportCurrentPage < 1) reportCurrentPage = 1;

    renderReportPagination(totalItems, reportCurrentPage, totalPages);

    // Slice to get only current page items
    const startIndex = (reportCurrentPage - 1) * pageSize;
    const pagedProducts = productsToRender.slice(startIndex, startIndex + pageSize);

    let html = '';
    pagedProducts.forEach((p, index) => {
        const qty = productUsageMap.get(String(p.id)) || 0;
        const cost = parseFloat(String(p.cost).replace(/,/g, '')) || 0;
        const priceA = parseFloat(String(p.price_a).replace(/,/g, '')) || 0;
        const priceB = parseFloat(String(p.price_b).replace(/,/g, '')) || 0;
        const priceC = parseFloat(String(p.price_c).replace(/,/g, '')) || 0;
        const itemIndex = startIndex + index + 1;

        html += `
            <tr class="hover:bg-slate-50 transition border-b border-gray-100 last:border-0">
                <td class="p-4 text-center text-gray-500">${itemIndex}</td>
                <td class="p-4 font-bold text-gray-900">${escapeHTML(p.id)}</td>
                <td class="p-4 text-gray-700 max-w-xs truncate" title="${escapeHTML(p.name)}">${escapeHTML(p.name)}</td>
                <td class="p-4 text-center font-extrabold text-blue-600 text-base">${qty.toLocaleString('th-TH')}</td>
                <td class="p-4 text-right text-gray-600">฿${cost.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td class="p-4 text-right text-emerald-600 font-semibold">฿${priceA.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td class="p-4 text-right text-gray-600">฿${priceB.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td class="p-4 text-right text-gray-600">฿${priceC.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
        `;
    });

    if (pagedProducts.length === 0) {
        document.getElementById('reportTableBody').innerHTML = `<tr><td colspan="8" class="p-10 text-center text-gray-400">ไม่พบข้อมูลการใช้งานอะไหล่</td></tr>`;
    } else {
        document.getElementById('reportTableBody').innerHTML = html;
    }

    document.getElementById('report_stat_total_items').innerText = `${productsToRender.length.toLocaleString('th-TH')} รายการ`;
    document.getElementById('report_stat_total_qty').innerText = `${totalQtySum.toLocaleString('th-TH')} ชิ้น`;
    document.getElementById('report_stat_total_cost').innerText = `฿${totalCostSum.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('report_stat_total_mid').innerText = `฿${totalMidSum.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

function changeReportPage(page) {
    reportCurrentPage = page;
    filterReport(false);
    const viewSection = document.getElementById('view-report');
    if (viewSection) {
        viewSection.scrollTop = 0;
    }
}

function renderReportPagination(totalItems, currentPage, totalPages) {
    const infoEl = document.getElementById('reportPaginationInfo');
    const controlsEl = document.getElementById('reportPaginationControls');
    if (!infoEl || !controlsEl) return;

    if (totalItems === 0) {
        infoEl.innerText = "ไม่พบรายการอะไหล่";
        controlsEl.innerHTML = '';
        return;
    }

    const pageSize = 20;
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);
    infoEl.innerHTML = `แสดง <span class="font-bold text-slate-800">${startItem} - ${endItem}</span> จากทั้งหมด <span class="font-bold text-slate-800">${totalItems}</span> รายการ (หน้า <span class="font-bold text-blue-600">${currentPage}</span> / ${totalPages})`;

    let buttonsHtml = '';

    // First page <<
    buttonsHtml += `
        <button onclick="changeReportPage(1)" ${currentPage === 1 ? 'disabled class="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed border border-gray-200"' : 'class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm"'} title="หน้าแรก">
            <i class="fa-solid fa-angles-left"></i>
        </button>
    `;

    // Prev page <
    buttonsHtml += `
        <button onclick="changeReportPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled class="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed border border-gray-200"' : 'class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm"'} title="หน้าก่อนหน้า">
            <i class="fa-solid fa-angle-left mr-1"></i> ก่อนหน้า
        </button>
    `;

    // Page numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        buttonsHtml += `<button onclick="changeReportPage(1)" class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition shadow-sm">1</button>`;
        if (startPage > 2) {
            buttonsHtml += `<span class="px-1 text-gray-400 text-xs font-bold">...</span>`;
        }
    }

    for (let p = startPage; p <= endPage; p++) {
        if (p === currentPage) {
            buttonsHtml += `<button class="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-extrabold shadow-md shadow-blue-500/20 cursor-default">${p}</button>`;
        } else {
            buttonsHtml += `<button onclick="changeReportPage(${p})" class="px-3.5 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm">${p}</button>`;
        }
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            buttonsHtml += `<span class="px-1 text-gray-400 text-xs font-bold">...</span>`;
        }
        buttonsHtml += `<button onclick="changeReportPage(${totalPages})" class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition shadow-sm">${totalPages}</button>`;
    }

    // Next page >
    buttonsHtml += `
        <button onclick="changeReportPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled class="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed border border-gray-200"' : 'class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm"'} title="หน้าถัดไป">
            ถัดไป <i class="fa-solid fa-angle-right ml-1"></i>
        </button>
    `;

    // Last page >>
    buttonsHtml += `
        <button onclick="changeReportPage(${totalPages})" ${currentPage === totalPages ? 'disabled class="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed border border-gray-200"' : 'class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm"'} title="หน้าสุดท้าย">
            <i class="fa-solid fa-angles-right"></i>
        </button>
    `;

    controlsEl.innerHTML = buttonsHtml;
}

function clearReportFilters() {
    document.getElementById('report_search_input').value = '';
    document.getElementById('report_filter_cat').value = 'all';
    document.getElementById('report_filter_cat_input').value = '';
    document.getElementById('report_filter_mach').value = 'all';
    document.getElementById('report_filter_mach_input').value = '';
    document.getElementById('report_filter_req').value = 'all';
    document.getElementById('report_filter_req_input').value = '';
    document.getElementById('report_filter_doc').value = 'all';
    document.getElementById('report_filter_doc_input').value = '';
    document.getElementById('report_filter_month').value = 'all';
    document.getElementById('report_filter_year').value = 'all';
    document.getElementById('report_filter_start_date').value = '';
    document.getElementById('report_filter_end_date').value = '';
    filterReport();
}

function exportReportToExcel() {
    if (reportFilteredProducts.length === 0) {
        showToast('ไม่มีข้อมูลที่จะส่งออก', 'warning');
        return;
    }
    
    const data = reportFilteredProducts.map((p, index) => {
        const qty = reportProductUsageMap.get(String(p.id)) || 0;
        const cost = parseFloat(String(p.cost).replace(/,/g, '')) || 0;
        const priceA = parseFloat(String(p.price_a).replace(/,/g, '')) || 0;
        const priceB = parseFloat(String(p.price_b).replace(/,/g, '')) || 0;
        const priceC = parseFloat(String(p.price_c).replace(/,/g, '')) || 0;

        return {
            "ลำดับ": index + 1,
            "รหัสสินค้า": String(p.id),
            "ชื่อสินค้า": p.name || '',
            "จำนวนที่เบิก": qty,
            "ราคาต้นทุน": cost,
            "ราคา (กลาง)": priceA,
            "ราคา (ตัวแทน)": priceB,
            "ราคา (ในเครือ)": priceC
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "รายงานเบิกใช้อะไหล่");
    
    const max_width = data.reduce((w, r) => Math.max(w, r["ชื่อสินค้า"].length), 10);
    worksheet["!cols"] = [
        { wch: 6 },  // ลำดับ
        { wch: 15 }, // รหัสสินค้า
        { wch: Math.min(max_width + 4, 50) }, // ชื่อสินค้า
        { wch: 15 }, // จำนวนที่เบิก
        { wch: 15 }, // ราคาต้นทุน
        { wch: 15 }, // ราคา (กลาง)
        { wch: 15 }, // ราคา (ตัวแทน)
        { wch: 15 }  // ราคา (ในเครือ)
    ];

    // Format numbers
    const numFormat = '"฿"#,##0.00';
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        // cols 4, 5, 6, 7 are cost, priceA, priceB, priceC (0-indexed)
        for (let C = 4; C <= 7; ++C) {
            const cell_ref = XLSX.utils.encode_cell({c: C, r: R});
            if (worksheet[cell_ref]) {
                worksheet[cell_ref].t = 'n';
                worksheet[cell_ref].z = numFormat;
            }
        }
        const qty_cell = XLSX.utils.encode_cell({c: 3, r: R});
        if (worksheet[qty_cell]) {
            worksheet[qty_cell].t = 'n';
            worksheet[qty_cell].z = '#,##0';
        }
    }

    const dateStr = new Date().toLocaleDateString('th-TH').replace(/\//g, '-');
    XLSX.writeFile(workbook, `รายงานการเบิกใช้อะไหล่_${dateStr}.xlsx`);
    showToast('ส่งออกไฟล์ Excel เรียบร้อยแล้ว', 'success');
}
        // ===== Manual Management System (ระบบจัดการคู่มือ) =====
        
        function getManualsData() {
            if (!db || !Array.isArray(db.manuals)) {
                if (!db) db = {};
                db.manuals = [
                    {
                        id: 'MAN-001',
                        title: 'คู่มือการใช้งานระบบเบิกจ่าย (POS)',
                        description: 'คำแนะนำการค้นหารายการเบิก การเลือกสินค้า การกรอกข้อมูลผู้เบิก และการยืนยันการเบิกจ่ายอะไหล่',
                        file_url: '',
                        file_type: 'application/pdf',
                        uploaded_at: '2026-07-20'
                    },
                    {
                        id: 'MAN-002',
                        title: 'คู่มือการจัดการสต็อกและเครื่องจักร',
                        description: 'ขั้นตอนการเพิ่มรายการอะไหล่ เติมสต็อกสินค้า และจับคู่อะไหล่เข้ากับเครื่องจักรในโรงงาน',
                        file_url: '',
                        file_type: 'image/png',
                        uploaded_at: '2026-07-20'
                    }
                ];
            }
            return db.manuals;
        }

        function initManualView() {
            renderPublicManualsTable();
        }

        function renderPublicManualsTable(filteredData = null) {
            const allManuals = filteredData || getManualsData();
            const tbody = document.getElementById('tableBodyPublicManuals');
            const countEl = document.getElementById('countPublicManuals');
            if (countEl) countEl.innerText = allManuals.length;
            if (!tbody) return;

            if (allManuals.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="py-12 text-center text-gray-400">
                            <i class="fa-solid fa-folder-open text-4xl mb-3 text-gray-300 block"></i>
                            <p class="text-sm font-medium">ยังไม่มีรายการคู่มือในระบบ</p>
                        </td>
                    </tr>
                `;
                renderGenericPagination('publicManualsPaginationContainer', 'publicManualsPaginationInfo', 'publicManualsPaginationControls', 0, 1, 20, 'changePublicManualsPage');
                return;
            }

            const pmPageSize = 20;
            const pmTotalItems = allManuals.length;
            const pmTotalPages = Math.ceil(pmTotalItems / pmPageSize);
            if (publicManualsCurrentPage > pmTotalPages) publicManualsCurrentPage = pmTotalPages;
            if (publicManualsCurrentPage < 1) publicManualsCurrentPage = 1;
            const pmStart = (publicManualsCurrentPage - 1) * pmPageSize;
            const pmEnd = pmStart + pmPageSize;
            const manuals = allManuals.slice(pmStart, pmEnd);

            tbody.innerHTML = manuals.map((m, idx) => `
                <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-3.5 px-4 text-center font-medium text-slate-500">${pmStart + idx + 1}</td>
                    <td class="py-3.5 px-4 font-semibold text-slate-800">
                        <div class="flex items-center gap-2">
                            <i class="${getManualIconClass(m.file_type)} text-indigo-600"></i>
                            <span>${escapeHTML(m.title)}</span>
                        </div>
                    </td>
                    <td class="py-3.5 px-4 text-slate-600 text-xs leading-relaxed">${escapeHTML(m.description || '-')}</td>
                    <td class="py-3.5 px-4 text-center">
                        <div class="flex items-center justify-center gap-2">
                            <button onclick="viewManual('${escapeHTML(m.id)}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold rounded-lg text-xs transition border border-purple-200">
                                <i class="fa-solid fa-eye text-xs"></i> ดูคู่มือ
                            </button>
                            <button onclick="downloadManual('${escapeHTML(m.id)}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs transition border border-indigo-200">
                                <i class="fa-solid fa-download text-xs"></i> ดาวน์โหลด
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            renderGenericPagination('publicManualsPaginationContainer', 'publicManualsPaginationInfo', 'publicManualsPaginationControls', pmTotalItems, publicManualsCurrentPage, pmPageSize, 'changePublicManualsPage');
        }

        window.changePublicManualsPage = function(page) {
            publicManualsCurrentPage = page;
            renderPublicManualsTable();
        };

        function filterPublicManualsTable() {
            const query = (document.getElementById('searchPublicManualsInput')?.value || '').toLowerCase().trim();
            publicManualsCurrentPage = 1;
            const manuals = getManualsData();
            if (!query) {
                renderPublicManualsTable(manuals);
                return;
            }
            const filtered = manuals.filter(m => 
                (m.title && m.title.toLowerCase().includes(query)) ||
                (m.description && m.description.toLowerCase().includes(query))
            );
            renderPublicManualsTable(filtered);
        }

        function initManageManualsView() {
            renderManageManualsTable();
        }

        function renderManageManualsTable(filteredData = null) {
            const allManuals = filteredData || getManualsData();
            const tbody = document.getElementById('tableBodyManageManuals');
            const countEl = document.getElementById('countManageManuals');
            if (countEl) countEl.innerText = allManuals.length;
            if (!tbody) return;

            if (allManuals.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="py-12 text-center text-gray-400">
                            <i class="fa-solid fa-book-open text-4xl mb-3 text-purple-200 block"></i>
                            <p class="text-sm font-medium text-slate-600">ยังไม่มีคู่มือในระบบ</p>
                            <p class="text-xs text-slate-400 mt-1">กดปุ่ม "อัพโหลดคู่มือ" เพื่อเพิ่มเอกสารหรือภาพคู่มือใหม่</p>
                        </td>
                    </tr>
                `;
                renderGenericPagination('manageManualsPaginationContainer', 'manageManualsPaginationInfo', 'manageManualsPaginationControls', 0, 1, 20, 'changeManualsPage');
                return;
            }

            const mmPageSize = 20;
            const mmTotalItems = allManuals.length;
            const mmTotalPages = Math.ceil(mmTotalItems / mmPageSize);
            if (manageManualsCurrentPage > mmTotalPages) manageManualsCurrentPage = mmTotalPages;
            if (manageManualsCurrentPage < 1) manageManualsCurrentPage = 1;
            const mmStart = (manageManualsCurrentPage - 1) * mmPageSize;
            const mmEnd = mmStart + mmPageSize;
            const manuals = allManuals.slice(mmStart, mmEnd);

            tbody.innerHTML = manuals.map((m, idx) => `
                <tr class="hover:bg-purple-50/40 transition-colors">
                    <td class="py-3.5 px-4 text-center font-medium text-slate-500">${mmStart + idx + 1}</td>
                    <td class="py-3.5 px-4 font-semibold text-slate-800">
                        <div class="flex items-center gap-2">
                            <i class="${getManualIconClass(m.file_type)} text-purple-600"></i>
                            <span>${escapeHTML(m.title)}</span>
                        </div>
                    </td>
                    <td class="py-3.5 px-4 text-slate-600 text-xs leading-relaxed">${escapeHTML(m.description || '-')}</td>
                    <td class="py-3.5 px-4 text-center">
                        <div class="flex items-center justify-center gap-2">
                            <button onclick="viewManual('${escapeHTML(m.id)}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold rounded-lg text-xs transition border border-purple-200">
                                <i class="fa-solid fa-eye text-xs"></i> ดูคู่มือ
                            </button>
                            <button onclick="downloadManual('${escapeHTML(m.id)}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs transition border border-indigo-200">
                                <i class="fa-solid fa-download text-xs"></i> ดาวน์โหลด
                            </button>
                        </div>
                    </td>
                    <td class="py-3.5 px-4 text-center">
                        <button onclick="editManual('${escapeHTML(m.id)}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold rounded-lg text-xs transition border border-amber-200">
                            <i class="fa-solid fa-pen-to-square text-xs"></i> แก้ไขคู่มือ
                        </button>
                    </td>
                    <td class="py-3.5 px-4 text-center">
                        <button onclick="deleteManual('${escapeHTML(m.id)}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-lg text-xs transition border border-red-200">
                            <i class="fa-solid fa-trash-can text-xs"></i> ลบ
                        </button>
                    </td>
                </tr>
            `).join('');

            renderGenericPagination('manageManualsPaginationContainer', 'manageManualsPaginationInfo', 'manageManualsPaginationControls', mmTotalItems, manageManualsCurrentPage, mmPageSize, 'changeManualsPage');
        }

        window.changeManualsPage = function(page) {
            manageManualsCurrentPage = page;
            renderManageManualsTable();
        };

        function filterManageManualsTable() {
            const query = (document.getElementById('searchManageManualsInput')?.value || '').toLowerCase().trim();
            manageManualsCurrentPage = 1;
            const manuals = getManualsData();
            if (!query) {
                renderManageManualsTable(manuals);
                return;
            }
            const filtered = manuals.filter(m => 
                (m.title && m.title.toLowerCase().includes(query)) ||
                (m.description && m.description.toLowerCase().includes(query))
            );
            renderManageManualsTable(filtered);
        }

        function getManualIconClass(fileType = '') {
            if (!fileType) return 'fa-solid fa-file-text';
            if (fileType.includes('pdf')) return 'fa-solid fa-file-pdf';
            if (fileType.includes('image')) return 'fa-solid fa-file-image';
            return 'fa-solid fa-file';
        }

        function openUploadManualModal(manualId = null) {
            const modal = document.getElementById('uploadManualModal');
            const titleEl = document.getElementById('uploadManualModalTitle');
            const form = document.getElementById('formManual');
            if (!modal || !form) return;

            form.reset();
            document.getElementById('manual_id_input').value = '';
            document.getElementById('manual_existing_file_url').value = '';
            document.getElementById('manual_existing_file_type').value = '';
            document.getElementById('manual_current_file_preview').classList.add('hidden');
            document.getElementById('manual_file_required_star').style.display = 'inline';

            if (manualId) {
                const manual = getManualsData().find(m => String(m.id) === String(manualId));
                if (manual) {
                    titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square text-purple-600 mr-2"></i>แก้ไขคู่มือ`;
                    document.getElementById('manual_id_input').value = manual.id;
                    document.getElementById('manual_title_input').value = manual.title || '';
                    document.getElementById('manual_desc_input').value = manual.description || '';
                    document.getElementById('manual_existing_file_url').value = manual.file_url || '';
                    document.getElementById('manual_existing_file_type').value = manual.file_type || '';
                    
                    if (manual.file_url) {
                        document.getElementById('manual_current_file_preview').classList.remove('hidden');
                        document.getElementById('manual_file_required_star').style.display = 'none';
                    }
                }
            } else {
                titleEl.innerHTML = `<i class="fa-solid fa-cloud-arrow-up text-purple-600 mr-2"></i>อัพโหลดคู่มือ`;
            }

            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }

        function closeUploadManualModal() {
            const modal = document.getElementById('uploadManualModal');
            if (modal) modal.classList.add('hidden');
            document.body.style.overflow = '';
        }

        function editManual(id) {
            openUploadManualModal(id);
        }

        async function submitManualForm(e) {
            e.preventDefault();
            const manualId = document.getElementById('manual_id_input').value;
            const title = document.getElementById('manual_title_input').value.trim();
            const description = document.getElementById('manual_desc_input').value.trim();
            const fileInput = document.getElementById('manual_file_input');
            let existingUrl = document.getElementById('manual_existing_file_url').value;
            let existingType = document.getElementById('manual_existing_file_type').value;

            if (!title) {
                showToast("กรุณากรอกชื่อคู่มือ", "warning");
                return;
            }

            let fileUrl = existingUrl;
            let fileType = existingType;

            showLoading(manualId ? 'กำลังบันทึกการแก้ไขคู่มือ...' : 'กำลังอัพโหลดคู่มือ...');

            try {
                if (fileInput && fileInput.files && fileInput.files[0]) {
                    const file = fileInput.files[0];
                    fileType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/png');
                    
                    // Convert file to Base64 data URL
                    fileUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = error => reject(error);
                        reader.readAsDataURL(file);
                    });
                }

                if (!fileUrl && !manualId) {
                    hideLoading();
                    showToast("กรุณาเลือกไฟล์คู่มือ (ภาพ หรือ PDF)", "warning");
                    return;
                }

                const manuals = getManualsData();
                let targetId = manualId;

                if (manualId) {
                    const idx = manuals.findIndex(m => String(m.id) === String(manualId));
                    if (idx !== -1) {
                        manuals[idx].title = title;
                        manuals[idx].description = description;
                        manuals[idx].file_url = fileUrl;
                        manuals[idx].file_type = fileType;
                        manuals[idx].updated_at = new Date().toISOString().split('T')[0];
                    }
                } else {
                    targetId = 'MAN-' + String(Date.now()).slice(-6);
                    manuals.push({
                        id: targetId,
                        title: title,
                        description: description,
                        file_url: fileUrl,
                        file_type: fileType,
                        uploaded_at: new Date().toISOString().split('T')[0]
                    });
                }

                db.manuals = manuals;
                
                // Cache to localStorage
                try {
                    const raw = localStorage.getItem(LS_CACHE_KEY);
                    let cacheObj = raw ? JSON.parse(raw) : { ts: Date.now(), data: db };
                    cacheObj.data = db;
                    cacheObj.ts = Date.now();
                    localStorage.setItem(LS_CACHE_KEY, JSON.stringify(cacheObj));
                } catch (_) {}

                // Send to backend API if available
                if (typeof API_URL !== 'undefined' && API_URL) {
                    try {
                        const res = await fetch(API_URL, {
                            method: 'POST',
                            body: JSON.stringify({
                                action: manualId ? 'editManual' : 'addManual',
                                payload: {
                                    id: targetId,
                                    title: title,
                                    description: description,
                                    file_url: fileUrl,
                                    file_type: fileType
                                }
                            })
                        });
                        const resJson = await res.json();
                        if (resJson && resJson.data && resJson.data.file_url) {
                            const driveUrl = resJson.data.file_url;
                            const targetManual = db.manuals.find(m => String(m.id) === String(targetId));
                            if (targetManual) {
                                targetManual.file_url = driveUrl;
                                // Save updated cache with Drive URL
                                try {
                                    const raw = localStorage.getItem(LS_CACHE_KEY);
                                    let cacheObj = raw ? JSON.parse(raw) : { ts: Date.now(), data: db };
                                    cacheObj.data = db;
                                    cacheObj.ts = Date.now();
                                    localStorage.setItem(LS_CACHE_KEY, JSON.stringify(cacheObj));
                                } catch (_) {}
                            }
                        }
                    } catch (err) {
                        console.warn('API sync warning:', err);
                    }
                }

                hideLoading();
                closeUploadManualModal();
                showToast(manualId ? "แก้ไขคู่มือเรียบร้อยแล้ว" : "อัพโหลดคู่มือสำเร็จ", "success");
                renderManageManualsTable();
                renderPublicManualsTable();
            } catch (err) {
                hideLoading();
                console.error(err);
                showToast("เกิดข้อผิดพลาด: " + err.message, "error");
            }
        }

        function deleteManual(id) {
            const manual = getManualsData().find(m => String(m.id) === String(id));
            if (!manual) return;

            Swal.fire({
                title: 'ยืนยันการลบคู่มือ?',
                text: `คุณต้องการลบคู่มือ "${manual.title}" ใช่หรือไม่?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'ใช่, ลบทันที',
                cancelButtonText: 'ยกเลิก',
            }).then((result) => {
                if (result.isConfirmed) {
                    showLoading('กำลังลบคู่มือ...');
                    db.manuals = getManualsData().filter(m => String(m.id) !== String(id));
                    
                    // Save cache
                    try {
                        const raw = localStorage.getItem(LS_CACHE_KEY);
                        let cacheObj = raw ? JSON.parse(raw) : { ts: Date.now(), data: db };
                        cacheObj.data = db;
                        cacheObj.ts = Date.now();
                        localStorage.setItem(LS_CACHE_KEY, JSON.stringify(cacheObj));
                    } catch (_) {}

                    // Sync API
                    if (typeof API_URL !== 'undefined' && API_URL) {
                        fetch(API_URL, {
                            method: 'POST',
                            body: JSON.stringify({
                                action: 'deleteManual',
                                payload: { id: id }
                            })
                        }).catch(err => console.warn('API sync delete warning:', err));
                    }

                    hideLoading();
                    showToast('ลบคู่มือเรียบร้อยแล้ว', 'success');
                    renderManageManualsTable();
                    renderPublicManualsTable();
                }
            });
        }

        function downloadManual(id) {
            const manual = getManualsData().find(m => String(m.id) === String(id));
            if (!manual) {
                showToast("ไม่พบข้อมูลคู่มือ", "error");
                return;
            }

            if (!manual.file_url) {
                const blob = new Blob([`คู่มือการใช้งาน: ${manual.title}\n\nรายละเอียด: ${manual.description || '-'}\n\nระบบ Spare Parts LDT`], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${manual.title}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast(`เริ่มการดาวน์โหลด ${manual.title}`, "success");
                return;
            }

            if (manual.file_url.startsWith('data:')) {
                const a = document.createElement('a');
                a.href = manual.file_url;
                const ext = (manual.file_type && manual.file_type.includes('pdf')) ? '.pdf' : '.png';
                a.download = (manual.title || 'manual') + ext;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                showToast(`เริ่มการดาวน์โหลด ${manual.title}`, "success");
            } else {
                window.open(manual.file_url, '_blank');
            }
        }

        let currentPreviewManual = null;

        function viewManual(id) {
            const manual = getManualsData().find(m => String(m.id) === String(id));
            if (!manual) {
                showToast("ไม่พบข้อมูลคู่มือ", "error");
                return;
            }

            currentPreviewManual = manual;
            const modal = document.getElementById('previewManualModal');
            const titleEl = document.getElementById('previewManualTitle');
            const subtitleEl = document.getElementById('previewManualSubtitle');
            const iconEl = document.getElementById('previewManualIcon');
            const container = document.getElementById('previewManualContainer');
            const downloadBtn = document.getElementById('btnDownloadFromPreview');


            titleEl.innerText = manual.title || 'ดูคู่มือ';
            subtitleEl.innerText = manual.description || 'เอกสารคู่มือการใช้งานระบบ';
            iconEl.className = getManualIconClass(manual.file_type) + ' text-lg';
            if (downloadBtn) downloadBtn.setAttribute('onclick', `downloadManual('${escapeHTML(manual.id)}')`);

            const fileUrl = manual.file_url || '';
            const fileType = (manual.file_type || '').toLowerCase();

            container.innerHTML = '';

            if (!fileUrl) {
                container.innerHTML = `
                    <div class="text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md my-auto">
                        <i class="fa-solid fa-file-lines text-5xl text-purple-300 mb-4 block"></i>
                        <h4 class="text-lg font-bold text-slate-800 mb-2">${escapeHTML(manual.title)}</h4>
                        <p class="text-xs text-slate-500 leading-relaxed mb-4">${escapeHTML(manual.description || 'ยังไม่มีรายละเอียดเพิ่มเติม')}</p>
                        <div class="p-3 bg-amber-50 rounded-xl text-amber-700 text-xs font-medium border border-amber-200">
                            <i class="fa-solid fa-triangle-exclamation mr-1"></i> ยังไม่ได้แนบไฟล์เอกสารในระบบ
                        </div>
                    </div>
                `;
            } else {
                let displayUrl = fileUrl;
                
                // Convert Google Drive uc download link to preview link for iframe if applicable
                if (fileUrl.includes('drive.google.com/uc?export=download&id=')) {
                    const fileId = fileUrl.split('id=')[1];
                    displayUrl = `https://drive.google.com/file/d/${fileId}/preview`;
                }

                if (fileType.includes('image') || fileUrl.startsWith('data:image/')) {
                    container.innerHTML = `<img src="${escapeHTML(fileUrl)}" alt="${escapeHTML(manual.title)}" class="max-h-full max-w-full object-contain rounded-xl shadow-lg border border-slate-200 bg-white">`;
                } else {
                    // PDF or Document (iframe viewer)
                    container.innerHTML = `<iframe src="${escapeHTML(displayUrl)}" class="w-full h-full rounded-xl border border-slate-200 bg-white shadow-inner" style="min-height: 500px;" frameborder="0" allow="autoplay"></iframe>`;
                }
            }

            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }

        function closePreviewManualModal() {
            const modal = document.getElementById('previewManualModal');
            if (modal) modal.classList.add('hidden');
            document.body.style.overflow = '';
        }

        function openManualNewTab() {
            if (!currentPreviewManual || !currentPreviewManual.file_url) {
                showToast("ไม่พบไฟล์สำหรับเปิดในหน้าใหม่", "warning");
                return;
            }
            let url = currentPreviewManual.file_url;
            if (url.includes('drive.google.com/uc?export=download&id=')) {
                const fileId = url.split('id=')[1];
                url = `https://drive.google.com/file/d/${fileId}/view`;
            }
            window.open(url, '_blank');
        }

