const API_URL = 'https://script.google.com/macros/s/AKfycbx2Y9ySye3CfrwPjr3WiVrYLAKwTj0YlSqiObr94h_L0SagMvxZ7sYTHVVk-jYUDyiLig/exec';
const FIREBASE_DB_URL = 'https://ltd-laundry-default-rtdb.asia-southeast1.firebasedatabase.app/.json';
        
        let db = { products: [], machines: [], mappings: [], purchaseOrders: [] };
        let isShowCostInCatalog = false;
        let isShowPriceBForGuest = false;
        let isShowPriceCForGuest = false;
        let selectedMappingProducts = new Set();
        let currentSelectedMachineForMapping = '';
        let isMobileCartOpen = false;

        let catalogCategories = [];
        let catalogMachines = [];
        let currentCatalogMode = 'products'; // 'products' หรือ 'machines'

        let currentCatalogPage = 1;
        let currentMapProductPage = 1;
        const MAP_PRODUCT_LIMIT = 50;
        let reportCurrentPage = 1;
        let reportFilteredProducts = [];
        let reportProductUsageMap = new Map();

        // ===== Auth System =====
        let isLoggedIn = false;
        let currentUser = null; // { fullName, department, phone, email, role }
        
        const ROLE_PERMISSIONS = {
            'user': ['view-catalog', 'view-pos', 'view-transactions', 'view-settings', 'view-manual'],
            'Technician': ['view-catalog', 'view-pos', 'view-transactions', 'view-settings', 'view-manual'],
            'Manager': ['view-catalog', 'view-pos', 'view-transactions', 'view-add-product', 'view-edit-products', 'view-restock', 'view-report', 'view-restock-history', 'view-settings', 'view-manage-manuals', 'view-manual', 'view-user-management'],
            'ADMIN': ['view-catalog', 'view-pos', 'view-transactions', 'view-add-product', 'view-machines', 'view-mapping', 'view-edit-products', 'view-edit-mapping', 'view-restock', 'view-report', 'view-restock-history', 'view-settings', 'view-manage-manuals', 'view-manual', 'view-user-management', 'view-purchase'],
            'StoreOfficer': ['view-catalog', 'view-purchase', 'view-settings']
        };

        function hasAccess(viewId) {
            if (viewId === 'view-catalog') return true;
            if (viewId === 'view-manual') {
                if (isLoggedIn && currentUser && currentUser.role === 'StoreOfficer') return false;
                return true;
            }
            if (!isLoggedIn || !currentUser) return false;
            const allowedViews = ROLE_PERMISSIONS[currentUser.role] || [];
            return allowedViews.includes(viewId);
        }

        document.addEventListener('DOMContentLoaded', () => { 
            const savedUser = sessionStorage.getItem('currentUser');
            if (savedUser) {
                try {
                    currentUser = JSON.parse(savedUser);
                    isLoggedIn = true;
                } catch (e) {
                    currentUser = null;
                    isLoggedIn = false;
                }
            }
            fetchData(true); 
            updateAuthUI(); 
        });

        document.addEventListener('click', function(event) {
            const inputCat = document.getElementById('input_filterCategory');
            if (inputCat) {
                const catContainer = inputCat.parentElement.parentElement;
                if (!catContainer.contains(event.target)) {
                    document.getElementById('dropdown_filterCategory').classList.add('hidden');
                    const hiddenCat = document.getElementById('filterCategory');
                    if(hiddenCat.value === 'all') inputCat.value = '';
                    else if(catalogCategories.includes(hiddenCat.value)) inputCat.value = hiddenCat.value;
                }
            }
            
            const inputMach = document.getElementById('input_filterMachine');
            if (inputMach) {
                const machContainer = inputMach.parentElement.parentElement;
                if (!machContainer.contains(event.target)) {
                    document.getElementById('dropdown_filterMachine').classList.add('hidden');
                    const hiddenMach = document.getElementById('filterMachine');
                    if(hiddenMach.value === 'all') inputMach.value = '';
                    else {
                        const m = catalogMachines.find(x => x.id === hiddenMach.value);
                        if(m) inputMach.value = m.id + ' : ' + m.name;
                    }
                }
            }
            
            const inputPosCat = document.getElementById('input_posCategoryFilter');
            if (inputPosCat) {
                const posCatContainer = inputPosCat.parentElement.parentElement;
                if (!posCatContainer.contains(event.target)) {
                    document.getElementById('dropdown_posCategoryFilter').classList.add('hidden');
                    const hiddenPosCat = document.getElementById('posCategoryFilter');
                    if (hiddenPosCat.value === 'all') inputPosCat.value = '';
                    else inputPosCat.value = hiddenPosCat.value;
                }
            }
            
            const inputPosMach = document.getElementById('input_posMachineFilter');
            if (inputPosMach) {
                const posMachContainer = inputPosMach.parentElement.parentElement;
                if (!posMachContainer.contains(event.target)) {
                    document.getElementById('dropdown_posMachineFilter').classList.add('hidden');
                    const hiddenPosMach = document.getElementById('posMachineFilter');
                    if (hiddenPosMach.value === 'all') inputPosMach.value = '';
                    else {
                        const m = db.machines.find(x => String(x.id) === hiddenPosMach.value);
                        if (m) inputPosMach.value = m.name;
                    }
                }
            }
            
            const mapMachContainer = document.getElementById('map_machine_search');
            if (mapMachContainer && !mapMachContainer.parentElement.contains(event.target)) hideMachineSuggestions();
            
            const restockProductInput = document.getElementById('restock_product_input');
            if (restockProductInput) {
                const restockContainer = restockProductInput.parentElement.parentElement;
                if (!restockContainer.contains(event.target)) {
                    document.getElementById('dropdown_restock_product').classList.add('hidden');
                }
            }

            const reportCatContainer = document.getElementById('report_filter_cat_input');
            if (reportCatContainer && !reportCatContainer.parentElement.contains(event.target)) {
                document.getElementById('report_filter_cat_dropdown').classList.add('hidden');
            }
            const reportMachContainer = document.getElementById('report_filter_mach_input');
            if (reportMachContainer && !reportMachContainer.parentElement.contains(event.target)) {
                document.getElementById('report_filter_mach_dropdown').classList.add('hidden');
            }
            const reportReqContainer = document.getElementById('report_filter_req_input');
            if (reportReqContainer && !reportReqContainer.parentElement.contains(event.target)) {
                document.getElementById('report_filter_req_dropdown').classList.add('hidden');
            }
            const reportDocContainer = document.getElementById('report_filter_doc_input');
            if (reportDocContainer && !reportDocContainer.parentElement.contains(event.target)) {
                document.getElementById('report_filter_doc_dropdown').classList.add('hidden');
            }
        });

        function escapeHTML(str) {
            if (str === null || str === undefined) return '';
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }

        function escapeForJS(str) {
            if (str === null || str === undefined) return '';
            return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        function fNumber(val, fallbackCalc) {
            let num = parseFloat(val);
            // แก้บัค 3: เช็คเฉพาะ NaN หรือ null/undefined ไม่รวม 0 เพื่อให้ราคา 0 บาทแสดงได้ถูกต้อง
            if (isNaN(num) || val === '' || val === null || val === undefined) {
                num = parseFloat(fallbackCalc);
            }
            if (isNaN(num)) num = 0; 
            return num.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        }

        // fNumberM: เหมือน fNumber แต่ treat ราคา 0 เป็น "ยังไม่ได้กำหนด" → fallback คำนวณจาก cost
        // ใช้กับหมวดหมู่เครื่องจักร เพื่อให้พฤติกรรมเหมือนหมวดหมู่อะไหล่
        function fNumberM(val, fallbackCalc) {
            let num = parseFloat(val);
            if (isNaN(num) || val === '' || val === null || val === undefined || num === 0) {
                num = parseFloat(fallbackCalc);
            }
            if (isNaN(num)) num = 0;
            return num.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        }

        function autoCalcMachinePrices(prefix) {
            const cost = parseFloat(document.getElementById(`${prefix}_cost`).value) || 0;
            if (cost > 0) {
                document.getElementById(`${prefix}_price_a`).value = (cost * 2.1).toFixed(2);
                document.getElementById(`${prefix}_price_b`).value = (cost * 1.7).toFixed(2);
                document.getElementById(`${prefix}_price_c`).value = (cost * 1.3).toFixed(2);
            } else {
                document.getElementById(`${prefix}_price_a`).value = '';
                document.getElementById(`${prefix}_price_b`).value = '';
                document.getElementById(`${prefix}_price_c`).value = '';
            }
        }

        function autoCalcSparePartPrices(prefix) {
            const cost = parseFloat(document.getElementById(`${prefix}_cost`).value) || 0;
            if (cost > 0) {
                document.getElementById(`${prefix}_price_a`).value = (cost * 2.1).toFixed(2);
                document.getElementById(`${prefix}_price_b`).value = (cost * 1.7).toFixed(2);
                document.getElementById(`${prefix}_price_c`).value = (cost * 1.3).toFixed(2);
            } else {
                document.getElementById(`${prefix}_price_a`).value = '';
                document.getElementById(`${prefix}_price_b`).value = '';
                document.getElementById(`${prefix}_price_c`).value = '';
            }
        }

        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const backdrop = document.getElementById('sidebarBackdrop');
            if (sidebar.classList.contains('-translate-x-full')) {
                sidebar.classList.remove('-translate-x-full');
                backdrop.classList.remove('hidden');
                document.body.style.overflow = 'hidden'; 
            } else {
                sidebar.classList.add('-translate-x-full');
                backdrop.classList.add('hidden');
                document.body.style.overflow = '';
            }
        }

        function switchView(viewId, element = null) {
            if (viewId === 'view-catalog' || viewId === 'view-manual') {
                // Public catalog and manuals always allowed
            } else if (!isLoggedIn) {
                showLoginDialog(() => switchView(viewId, element));
                return;
            } else if (!hasAccess(viewId)) {
                showToast("คุณไม่มีสิทธิ์เข้าถึงส่วนงานนี้", "error");
                return;
            }
            document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
            document.getElementById(viewId).classList.remove('hidden');

            if (viewId === 'view-restock') {
                initRestockView();
            }
            if (viewId === 'view-manual') {
                initManualView();
            }
            if (viewId === 'view-manage-manuals') {
                initManageManualsView();
            }
            if (viewId === 'view-user-management') {
                fetchAndRenderUsersList();
            }
            if (viewId === 'view-purchase') {
                closePurchaseSubSection();
                const isAdmin = currentUser && currentUser.role === 'ADMIN';
                const cardManage = document.getElementById('card-manage-orders');
                if (cardManage) {
                    cardManage.classList.toggle('hidden', !isAdmin);
                }
                const cardHistory = document.getElementById('card-purchase-history');
                if (cardHistory) {
                    cardHistory.classList.toggle('hidden', !isAdmin);
                }
                const cardOverview = document.getElementById('card-purchase-overview');
                if (cardOverview) {
                    cardOverview.classList.toggle('hidden', !isAdmin);
                }
            }

            if (element) {
                document.querySelectorAll('.menu-item').forEach(el => {
                    el.classList.remove('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-900/20');
                    el.classList.add('text-gray-300');
                });
                element.classList.remove('text-gray-300');
                element.classList.add('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-900/20');
            } else {
                const subSettingsViews = ['view-mapping', 'view-edit-products', 'view-edit-mapping', 'view-manage-manuals', 'view-user-management'];
                if (subSettingsViews.includes(viewId)) {
                    const settingsLink = document.querySelector('[data-view="view-settings"] a');
                    if (settingsLink) {
                        document.querySelectorAll('.menu-item').forEach(el => {
                            el.classList.remove('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-900/20');
                            el.classList.add('text-gray-300');
                        });
                        settingsLink.classList.remove('text-gray-300');
                        settingsLink.classList.add('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-900/20');
                    }
                }
            }
            if (window.innerWidth < 768) {
                const sidebar = document.getElementById('sidebar');
                if (!sidebar.classList.contains('-translate-x-full')) toggleSidebar();
            }
        }

        function showRegisterDialog() {
            Swal.fire({
                title: '<i class="fa-solid fa-user-plus text-blue-500 mr-2"></i>สมัครสมาชิกใหม่',
                html: `
                    <div class="space-y-3 text-left mt-1 text-xs">
                        <div>
                            <label class="block font-semibold text-gray-600 mb-1">ชื่อ-สกุล <span class="text-red-500">*</span></label>
                            <input type="text" id="reg-fullname" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="เช่น นายสมชาย ใจดี">
                        </div>
                        <div>
                            <label class="block font-semibold text-gray-600 mb-1">แผนก/ฝ่ายงาน <span class="text-red-500">*</span></label>
                            <input type="text" id="reg-department" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="เช่น ซ่อมบำรุง (Maintenance)">
                        </div>
                        <div class="grid grid-cols-2 gap-2.5">
                            <div>
                                <label class="block font-semibold text-gray-600 mb-1">เบอร์โทรศัพท์ <span class="text-red-500">*</span></label>
                                <input type="text" id="reg-phone" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="เช่น 0891234567">
                            </div>
                            <div>
                                <label class="block font-semibold text-gray-600 mb-1">อีเมล <span class="text-red-500">*</span></label>
                                <input type="email" id="reg-email" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="เช่น somchai@gmail.com">
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2.5">
                            <div>
                                <label class="block font-semibold text-gray-600 mb-1">รหัสผ่าน <span class="text-red-500">*</span></label>
                                <input type="password" id="reg-password" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="รหัสผ่าน 6 ตัวขึ้นไป">
                            </div>
                            <div>
                                <label class="block font-semibold text-gray-600 mb-1">ยืนยันรหัสผ่าน <span class="text-red-500">*</span></label>
                                <input type="password" id="reg-confirm-password" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="พิมพ์อีกครั้ง">
                            </div>
                        </div>
                        <div>
                            <label class="block font-semibold text-gray-600 mb-1">ประเภทบุคคล (Personnel Type) <span class="text-red-500">*</span></label>
                            <select id="reg-usertype" class="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-800 bg-white cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500">
                                <option value="" disabled selected>-- เลือกประเภทบุคคล --</option>
                                <option value="insource">Insource (บุคลากรภายใน)</option>
                                <option value="outsource">Outsource (บุคลากรภายนอก)</option>
                            </select>
                        </div>
                    </div>
                `,
                confirmButtonText: 'สมัครสมาชิก',
                confirmButtonColor: '#10b981',
                showCancelButton: true,
                cancelButtonText: 'ย้อนกลับไปล็อกอิน',
                cancelButtonColor: '#6b7280',
                reverseButtons: true,
                customClass: {
                    popup: 'rounded-2xl',
                    confirmButton: 'rounded-xl font-semibold !text-xs',
                    cancelButton: 'rounded-xl font-semibold !text-xs',
                },
                preConfirm: () => {
                    const fullName = document.getElementById('reg-fullname').value.trim();
                    const department = document.getElementById('reg-department').value.trim();
                    const phone = document.getElementById('reg-phone').value.trim();
                    const email = document.getElementById('reg-email').value.trim();
                    const password = document.getElementById('reg-password').value;
                    const confirmPassword = document.getElementById('reg-confirm-password').value;
                    const userType = document.getElementById('reg-usertype').value;
                    
                    if (!fullName || !department || !phone || !email || !password || !confirmPassword || !userType) {
                        Swal.showValidationMessage('กรุณากรอกข้อมูลและเลือกประเภทบุคคลให้ครบถ้วนทุกช่อง');
                        return false;
                    }
                    if (password.length < 6) {
                        Swal.showValidationMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
                        return false;
                    }
                    if (password !== confirmPassword) {
                        Swal.showValidationMessage('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
                        return false;
                    }
                    
                    return {
                        fullName: fullName,
                        department: department,
                        phone: phone,
                        email: email,
                        password: password,
                        userType: userType
                    };
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    showLoading('กำลังลงทะเบียนบัญชีผู้ใช้...');
                    fetch(API_URL, {
                        method: 'POST',
                        body: JSON.stringify({
                            action: 'registerUser',
                            payload: result.value
                        })
                    }).then(res => res.json())
                    .then(resData => {
                        hideLoading();
                        if (resData.status === 'success') {
                            Swal.fire({
                                icon: 'success',
                                title: 'สมัครสมาชิกสำเร็จ!',
                                text: 'คุณสามารถเข้าสู่ระบบด้วย อีเมล หรือ เบอร์โทรศัพท์ ได้ทันที',
                                confirmButtonText: 'ตกลง',
                                confirmButtonColor: '#10b981'
                            }).then(() => {
                                showLoginDialog();
                            });
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'ลงทะเบียนล้มเหลว',
                                text: resData.message || 'ข้อมูลไม่ถูกต้อง',
                                confirmButtonText: 'ลองใหม่'
                            }).then(() => {
                                showRegisterDialog();
                            });
                        }
                    }).catch(err => {
                        hideLoading();
                        console.error(err);
                        showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
                    });
                } else if (result.dismiss === Swal.DismissReason.cancel) {
                    showLoginDialog();
                }
            });
        }

        function showLoginDialog(onSuccess = null) {
            Swal.fire({
                title: '<i class="fa-solid fa-lock text-blue-500 mr-2"></i>เข้าสู่ระบบ',
                html: `
                    <div class="space-y-3 text-left mt-1 text-xs">
                        <div>
                            <label class="block font-semibold text-gray-600 mb-1.5">อีเมล หรือ เบอร์โทรศัพท์</label>
                            <input type="text" id="swal-username"
                                class="swal2-input !mx-0 !w-full !text-xs !h-9"
                                placeholder="ระบุอีเมลหรือเบอร์โทรศัพท์"
                                autocomplete="username">
                        </div>
                        <div>
                            <label class="block font-semibold text-gray-600 mb-1.5">รหัสผ่าน (Password)</label>
                            <input type="password" id="swal-password"
                                class="swal2-input !mx-0 !w-full !text-xs !h-9"
                                placeholder="••••••••"
                                autocomplete="current-password">
                        </div>
                        <div class="text-center pt-2">
                            <a href="#" onclick="event.preventDefault(); Swal.close(); showRegisterDialog();" class="text-xs text-blue-600 hover:text-blue-500 font-bold hover:underline">
                                <i class="fa-solid fa-user-plus mr-1"></i> ยังไม่มีบัญชี? สมัครสมาชิกใหม่
                            </a>
                        </div>
                    </div>
                `,
                confirmButtonText: '<i class="fa-solid fa-right-to-bracket mr-2"></i>เข้าสู่ระบบ',
                confirmButtonColor: '#2563eb',
                showCancelButton: true,
                cancelButtonText: 'ยกเลิก',
                cancelButtonColor: '#6b7280',
                reverseButtons: true,
                focusConfirm: false,
                customClass: {
                    popup: 'rounded-2xl',
                    confirmButton: 'rounded-xl font-semibold !text-xs',
                    cancelButton: 'rounded-xl font-semibold !text-xs',
                },
                didOpen: () => {
                    document.getElementById('swal-password').addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') Swal.clickConfirm();
                    });
                },
                showLoaderOnConfirm: true,
                preConfirm: () => {
                    const username = document.getElementById('swal-username').value.trim();
                    const password = document.getElementById('swal-password').value;
                    
                    if (!username || !password) {
                        Swal.showValidationMessage('กรุณากรอกทั้งข้อมูลชื่อผู้ใช้และรหัสผ่าน');
                        return false;
                    }
                    
                    return fetch(API_URL, {
                        method: 'POST',
                        body: JSON.stringify({
                            action: 'loginUser',
                            payload: { username: username, password: password }
                        })
                    }).then(res => {
                        if (!res.ok) {
                            throw new Error('การเชื่อมต่อเซิร์ฟเวอร์ล้มเหลว');
                        }
                        return res.json();
                    }).then(resData => {
                        if (resData.status !== 'success') {
                            throw new Error(resData.message || 'อีเมล/เบอร์โทรศัพท์ หรือรหัสผ่านไม่ถูกต้อง');
                        }
                        return resData.data; // User info object
                    }).catch(error => {
                        Swal.showValidationMessage(`<i class="fa-solid fa-circle-exclamation mr-2"></i>${error.message}`);
                    });
                },
                allowOutsideClick: () => !Swal.isLoading()
            }).then((result) => {
                if (result.isConfirmed && result.value) {
                    isLoggedIn = true;
                    currentUser = result.value; // Save full user object
                    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                    updateAuthUI();
                    showToast(`ยินดีต้อนรับ ${currentUser.fullName}!`, 'success');
                    if (onSuccess) onSuccess();
                }
            });
        }

        function logout() {
            confirmAction(`ยืนยันการออกจากระบบ?\nคุณจะกลับไปยังหน้าแคตตาล็อกสาธารณะ`, () => {
                isLoggedIn = false;
                currentUser = null;
                sessionStorage.removeItem('currentUser');
                updateAuthUI();
                switchView('view-catalog');
                document.querySelectorAll('.menu-item').forEach(el => {
                    el.classList.remove('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-900/20');
                    el.classList.add('text-gray-300');
                });
                const catalogBtn = document.querySelector('[onclick="switchView(\'view-catalog\', this)"]');
                if (catalogBtn) {
                    catalogBtn.classList.remove('text-gray-300');
                    catalogBtn.classList.add('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-900/20');
                }
                showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
            });
        }

        function updateAuthUI() {
            document.querySelectorAll('.protected-nav-item').forEach(el => {
                if (!isLoggedIn) {
                    el.classList.add('hidden');
                } else {
                    const viewId = el.getAttribute('data-view');
                    if (viewId === 'divider-admin') {
                        el.classList.toggle('hidden', currentUser.role !== 'ADMIN' && currentUser.role !== 'Manager');
                    } else if (viewId === 'divider-pos') {
                        el.classList.toggle('hidden', !hasAccess('view-pos') && !hasAccess('view-transactions'));
                    } else {
                        el.classList.toggle('hidden', !hasAccess(viewId));
                    }
                }
            });

            const manualNavItem = document.getElementById('nav-item-manual');
            if (manualNavItem) {
                if (!isLoggedIn) {
                    manualNavItem.classList.remove('hidden');
                } else {
                    manualNavItem.classList.toggle('hidden', !hasAccess('view-manual'));
                }
            }
            
            initSettingsView();
            
            const dbBtn = document.querySelector('[onclick="initDatabase()"]');
            if (dbBtn) {
                dbBtn.classList.toggle('hidden', !isLoggedIn || currentUser.role !== 'ADMIN');
            }

            document.getElementById('auth-login-prompt').classList.toggle('hidden', isLoggedIn);
            document.getElementById('auth-user-info').classList.toggle('hidden', !isLoggedIn);
            if (isLoggedIn && currentUser) {
                let roleColor = 'bg-gray-500';
                if (currentUser.role === 'ADMIN') roleColor = 'bg-red-600';
                else if (currentUser.role === 'Manager') roleColor = 'bg-amber-600';
                else if (currentUser.role === 'Technician') roleColor = 'bg-purple-600';
                else if (currentUser.role === 'StoreOfficer') roleColor = 'bg-emerald-600';
                
                let userTypeLabel = '';
                if (currentUser.role !== 'ADMIN' && currentUser.role !== 'Manager' && currentUser.role !== 'StoreOfficer') {
                    userTypeLabel = currentUser.userType === 'outsource' ? ' (Outsource)' : ' (Insource)';
                }
                
                document.getElementById('auth-username-display').innerHTML = `
                    <div class="flex flex-col text-left">
                        <span class="font-bold text-white text-xs truncate">${escapeHTML(currentUser.fullName)}</span>
                        <span class="text-[9px] text-gray-400 truncate mt-0.5">${escapeHTML(currentUser.department)}</span>
                        <span class="text-[8px] font-extrabold text-white px-1.5 py-0.5 rounded ${roleColor} w-max mt-1 uppercase">${currentUser.role === 'StoreOfficer' ? 'Store Officer' : currentUser.role}${userTypeLabel}</span>
                    </div>
                `;
            } else {
                closeProductDetailModal();
            }
            if (typeof db !== 'undefined' && db && db.products && db.products.length > 0) {
                renderCatalog();
            }
        }

        // ===== SweetAlert2 Notification System =====
        const SwalToast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3500,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.onmouseenter = Swal.stopTimer;
                toast.onmouseleave = Swal.resumeTimer;
            }
        });

        function showLoading(text = 'กำลังโหลดข้อมูล...') {
            Swal.fire({
                title: text,
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => { Swal.showLoading(); }
            });
        }

        function hideLoading() { Swal.close(); }

        function showToast(message, type = 'success') {
            const iconMap = { success: 'success', error: 'error', info: 'info' };
            SwalToast.fire({
                icon: iconMap[type] || 'success',
                title: message
            });
        }

        function confirmAction(message, callback) {
            Swal.fire({
                title: 'ยืนยันการดำเนินการ',
                html: escapeHTML(message).replace(/\n/g, '<br>'),
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc2626',
                cancelButtonColor: '#6b7280',
                confirmButtonText: '<i class="fa-solid fa-check mr-1"></i> ยืนยัน',
                cancelButtonText: 'ยกเลิก',
                reverseButtons: true,
                customClass: {
                    popup: 'rounded-2xl shadow-2xl',
                    confirmButton: 'rounded-xl font-semibold px-5',
                    cancelButton: 'rounded-xl font-semibold px-5',
                }
            }).then((result) => {
                if (result.isConfirmed) callback();
            });
        }

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

        const LS_CACHE_KEY = 'spareparts_cache_v1';
        const LS_CACHE_TTL = 5 * 60 * 1000; // 5 นาที (ms)

        async function fetchData(forceRefresh = false) {
            // ถ้าไม่ได้บังคับ refresh → ตรวจสอบ localStorage cache ก่อน
            if (!forceRefresh) {
                try {
                    const raw = localStorage.getItem(LS_CACHE_KEY);
                    if (raw) {
                        const cached = JSON.parse(raw);
                        const age = Date.now() - (cached.ts || 0);
                        const hasData = cached.data
                            && Array.isArray(cached.data.products)
                            && cached.data.products.length > 0;

                        if (age < LS_CACHE_TTL && hasData) {
                            // ข้อมูล cache ยังสดและไม่ว่าง → แสดงทันที
                            db = cached.data;
                            updateAllViews();
                            // ดึงข้อมูลใหม่เบื้องหลัง (ไม่แสดง spinner)
                            _fetchFromServer(true);
                            return;
                        }
                    }
                } catch(e) {
                    // localStorage มีปัญหา → ล้าง cache แล้วดึงใหม่
                    try { localStorage.removeItem(LS_CACHE_KEY); } catch(_) {}
                }
            }

            // ไม่มี cache / cache หมดอายุ / ข้อมูลว่าง → ดึงจาก server + แสดง spinner
            showLoading('กำลังดึงข้อมูลระบบ...');
            await _fetchFromServer(false);
        }

        async function _fetchFromServer(background = false) {
            try {
                let data = null;
                
                // ลองดึงจาก Firebase ก่อนเพื่อความเร็วสูงสุด
                if (FIREBASE_DB_URL) {
                    try {
                        const res = await fetch(FIREBASE_DB_URL);
                        if (res.ok) {
                            let fbData = await res.json();
                            if (fbData) {
                                // ป้องกันปัญหา Firebase แปลง Array ที่ดัชนีไม่เรียงกัน (Sparse Array) ให้กลายเป็น Object
                                const ensureArray = (val) => {
                                    if (!val) return [];
                                    if (Array.isArray(val)) return val;
                                    if (typeof val === 'object') {
                                        return Object.keys(val)
                                            .sort((a, b) => Number(a) - Number(b))
                                            .map(key => val[key]);
                                    }
                                    return [];
                                };
                                
                                const appDataNode = fbData.appData || {};
                                const consolidated = {
                                    products: ensureArray(appDataNode.products),
                                    machines: ensureArray(appDataNode.machines),
                                    mappings: ensureArray(fbData.mappings),
                                    settings: appDataNode.settings || {},
                                    manuals: ensureArray(appDataNode.manuals),
                                    lots: ensureArray(fbData.lots),
                                    purchaseOrders: ensureArray(appDataNode.purchaseOrders)
                                };
                                
                                if (consolidated.products && consolidated.products.length > 0) {
                                    data = consolidated;
                                }
                            }
                        }
                    } catch (fbErr) {
                        console.warn("ดึงข้อมูลจาก Firebase ล้มเหลว กำลังใช้การดึงข้อมูลสำรองจาก Google Apps Script: ", fbErr);
                    }
                }
                
                // หากดึงจาก Firebase ไม่สำเร็จ, ข้อมูลว่างเปล่า, หรือรูปแบบไม่ถูกต้อง -> ดึงจาก Google Apps Script สำรอง (Google Drive)
                if (!data || !data.products || !Array.isArray(data.products)) {
                    const res = await fetch(API_URL + '?action=getAppData', { method: 'GET' });
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    data = await res.json();
                }

                // ตรวจสอบว่าข้อมูลที่ได้กลับมา valid ก่อน cache
                if (data && Array.isArray(data.products)) {
                    try {
                        localStorage.setItem(LS_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
                    } catch(e) { /* storage full → ข้ามได้ */ }
                    db = data;
                    updateAllViews();
                } else {
                    throw new Error('ข้อมูลที่ได้รับไม่ถูกต้อง');
                }
            } catch (error) {
                if (!background) showToast('ไม่สามารถดึงข้อมูลได้: ' + error.message, 'error');
            }
            if (!background) hideLoading();
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
        function initRestockView() {
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
        // ===== POS (Point of Sale) Client Logic =====
        let posCart = [];
        let transactions = [];

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

        async function submitMobilePOSCheckout() {
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
    
    let restockTxs = transactions.filter(t => t.status === 'Restock');
    
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

        function renderTransactionsTable() {
            const tbody = document.getElementById('transactionTableBody');
            const searchKeyword = document.getElementById('searchTransactionInput').value.toLowerCase();
            const keywords = searchKeyword.split(/\s+/).filter(k => k.length > 0);
            const statusFilter = document.getElementById('filterTransactionStatus').value;
            
            tbody.innerHTML = '';

            // กรองข้อมูลสำหรับบทบาททั่วไป ให้เห็นเฉพาะของตัวเอง
            let transactionsToRender = transactions;
            if (isLoggedIn && currentUser && currentUser.role !== 'ADMIN' && currentUser.role !== 'Manager') {
                transactionsToRender = transactions.filter(t => t.requester === currentUser.fullName);
            }
            
            let filtered = transactionsToRender.filter(t => {
                const textToSearch = `${t.id} ${t.requester} ${t.department}`.toLowerCase();
                const matchSearch = keywords.length === 0 || keywords.every(kw => textToSearch.includes(kw));
                const matchStatus = statusFilter === 'all' || t.status === statusFilter;
                return matchSearch && matchStatus;
            });
            
            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="9" class="p-10 text-center text-gray-400"><i class="fa-solid fa-receipt text-4xl mb-3 opacity-30 block"></i>ไม่พบข้อมูลใบเบิกที่ค้นหา</td></tr>`;
                return;
            }
            
            filtered.forEach((t, index) => {
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
                        <td class="p-4 text-center text-gray-500">${index + 1}</td>
                        <td class="p-4 font-bold text-gray-900">${escapeHTML(t.id)}</td>
                        <td class="p-4 text-gray-500 text-xs font-semibold">${escapeHTML(t.date)}</td>
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
        }

        function openTransactionDetailModal(txId) {
            const t = transactions.find(x => x.id === txId);
            if (!t) return;
            
            const isRestock = t.status === 'Restock';
            document.getElementById('tdm_id_subtitle').innerText = (isRestock ? "เลขที่ใบเติมสต็อก: " : "เลขที่ใบเบิก: ") + t.id;
            document.getElementById('tdm_date').innerText = t.date;
            document.getElementById('tdm_requester').innerText = t.requester;
            document.getElementById('tdm_department').innerText = t.department;
            
            const machine = t.machine_id ? db.machines.find(m => m.id == t.machine_id) : null;
            const machineText = machine ? (t.machine_id + " : " + machine.name) : (t.machine_id || "ไม่ระบุเครื่องจักร");
            document.getElementById('tdm_machine').innerText = isRestock ? "-" : machineText;
            document.getElementById('tdm_serial_number').innerText = isRestock ? "-" : (t.serial_number || "ไม่ระบุ");
            document.getElementById('tdm_note').innerText = t.note || "ไม่มีบันทึกข้อมูลเพิ่มเติม";
            
            const isCancelled = t.status === 'Cancelled';
            const statusEl = document.getElementById('tdm_status');
            if (isCancelled) {
                statusEl.className = "text-red-600 font-extrabold text-sm";
                statusEl.innerHTML = '<i class="fa-solid fa-circle-xmark mr-1"></i> ยกเลิกใบเบิก (คืนสต็อกแล้ว)';
                document.getElementById('tdmCancelBtn').classList.add('hidden');
            } else if (isRestock) {
                statusEl.className = "text-blue-600 font-extrabold text-sm";
                statusEl.innerHTML = '<i class="fa-solid fa-boxes-stacked mr-1"></i> เติมสต็อกสำเร็จ';
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
                const prodName = db.products.find(p => p.id == item.product_id)?.name || 'ไม่พบชื่อสินค้า';
                const subtotal = item.qty * item.price;
                const priceStr = isRestock ? '-' : `฿${item.price.toLocaleString('th-TH', {minimumFractionDigits: 2})}`;
                const subtotalStr = isRestock ? '-' : `฿${subtotal.toLocaleString('th-TH', {minimumFractionDigits: 2})}`;
                let tr = `
                    <tr class="hover:bg-slate-50 border-b border-gray-100 last:border-0">
                        <td class="p-3 font-mono font-bold text-gray-800">${escapeHTML(item.product_id)}</td>
                        <td class="p-3 text-gray-600 text-xs">${escapeHTML(prodName)}</td>
                        <td class="p-3 text-right font-bold text-gray-800">${item.qty}</td>
                        <td class="p-3 text-right text-gray-500">${priceStr}</td>
                        <td class="p-3 text-right font-bold text-blue-600">${subtotalStr}</td>
                    </tr>
                `;
                itemsTbody.insertAdjacentHTML('beforeend', tr);
            });
            
            document.getElementById('tdm_total_price').innerText = isRestock ? '-' : '฿' + t.total_price.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            
            // พิมพ์ใบเสร็จเบิก
            document.getElementById('tdmPrintBtn').onclick = () => printPOSSlip(t);
            
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

            const machine = t.machine_id ? db.machines.find(m => m.id == t.machine_id) : null;
            const isRestock = t.status === 'Restock';
            const machineText = isRestock ? '-' : (machine ? (t.machine_id + " : " + machine.name) : (t.machine_id || "-"));
            const docTitle = isRestock ? 'ใบนำส่ง/เติมสต็อกอะไหล่' : 'ใบเบิกอะไหล่';
            const operatorLabel = isRestock ? 'ผู้เติมสต็อก:' : 'ผู้เบิก:';
            const logoUrl = 'https://lh3.googleusercontent.com/d/1kH8HErbms_U0xnoiJ7jlW7r79FK3hXeB'; // โลโก้
            const companyNameTh = 'บริษัท พีรพัฒน์ เทคโนโลยี จำกัด (มหาชน) สำนักงานใหญ่';
            const companyNameEn = 'PEERAPAT TECHNOLOGY PUBLIC COMPANY LIMITED';
            const companyAddressTh = '406 ถ.รัชดาภิเษก แขวงสามเสนนอก เขตห้วยขวาง กรุงเทพ 10310';
            const companyAddressEn = '406 Ratchadapisek Rd., Samsen Nork, Huaykwang, Bangkok 10310';
            const companyContact = 'Tel. 02-290-1200 Fax: 02-290-1249';
            const companyWebsite = 'Web site: https://www.peerapat.com';
            const companyTaxId = 'เลขประจำตัวผู้เสียภาษี 0107551000231';

            let totalQty = 0;
            let itemsRows = '';
            let rowNum = 1;
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
                + '@media print { .watermark { position:fixed; } }';

            const html = '<!DOCTYPE html>'
                + '<html lang="th"><head><meta charset="UTF-8">'
                + '<title>ใบเบิกอะไหล่ - ' + t.id + '<\/title>'
                + '<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">'
                + '<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>'
                + '<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>'
                + '<style>' + css + '<\/style>'
                + '<\/head><body>'
                + '<\/head><body onload="window.print()">'
                + '<img class="watermark" src="' + logoUrl + '" alt="">'
                + '<div class="print-toolbar">'
                + '<button onclick="exportPDF()" style="margin-right:10px;background:#16a34a;">&#128196; บันทึกเป็น PDF<\/button>'
                + '<button onclick="window.print()">&#128424; พิมพ์ใบเบิกอะไหล่<\/button>'
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
                + '  pdf.save("ใบเบิกอะไหล่-' + t.id + '.pdf");'
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
                            + '<div class="meta-left">'
                                + '<div class="meta-row"><span class="meta-label">' + (isRestock ? "เลขที่ใบเติมสต็อก:" : "เลขที่ใบเบิก:") + '<\/span> ' + t.id + '<\/div>'
                                + '<div class="meta-row"><span class="meta-label">วันที่:<\/span> ' + t.date + '<\/div>'
                                + '<div class="meta-row"><span class="meta-label">เครื่องจักร:<\/span> ' + machineText + '<\/div>'
                            + '<\/div>'
                            + '<div class="meta-right">'
                                + '<div class="meta-row"><span class="meta-label">' + operatorLabel + '<\/span> ' + (t.requester || '-') + '<\/div>'
                                + '<div class="meta-row"><span class="meta-label">แผนก:<\/span> ' + (t.department || '-') + '<\/div>'
                                + '<div class="meta-row"><span class="meta-label">Serial Number:<\/span> ' + (isRestock ? '-' : (t.serial_number || '-')) + '<\/div>'
                            + '<\/div>'
                        + '<\/div>'
                        + '<div class="purpose-bar"><span class="meta-label">' + (isRestock ? "หมายเหตุการเติมสต็อก:" : "วัตถุประสงค์การเบิก:") + '<\/span> ' + (t.note || '-') + '<\/div>'
                        + '<table class="items-table">'
                            + '<thead><tr>'
                                + '<th>รายการ<\/th>'
                                + '<th style="width:80px;text-align:right;">จำนวน<\/th>'
                                + '<th style="width:70px;text-align:right;">หน่วย<\/th>'
                            + '<\/tr><\/thead>'
                            + '<tbody>' + itemsRows + '<\/tbody>'
                        + '<\/table>'
                    + '<\/div>'
                    + '<div class="sig-zone">'
                        + '<div class="sig-col"><div class="sig-line">ลงชื่อ ...............................<\/div><div class="sig-name">(ผู้ขอ/จ่ายของสโตร์)<\/div><\/div>'
                        + '<div class="sig-col"><div class="sig-line">ลงชื่อ ...............................<\/div><div class="sig-name">(ผู้รับมอบ)<\/div><div class="sig-name">ผู้บันทึก<\/div><\/div>'
                    + '<\/div>'
                + '<\/div>'
                + '<\/div>'
                + '<\/body><\/html>';

            doc.open();
            doc.write(html);
            doc.close();
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
            const manuals = filteredData || getManualsData();
            const tbody = document.getElementById('tableBodyPublicManuals');
            const countEl = document.getElementById('countPublicManuals');
            if (countEl) countEl.innerText = manuals.length;
            if (!tbody) return;

            if (manuals.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="py-12 text-center text-gray-400">
                            <i class="fa-solid fa-folder-open text-4xl mb-3 text-gray-300 block"></i>
                            <p class="text-sm font-medium">ยังไม่มีรายการคู่มือในระบบ</p>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = manuals.map((m, idx) => `
                <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-3.5 px-4 text-center font-medium text-slate-500">${idx + 1}</td>
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
        }

        function filterPublicManualsTable() {
            const query = (document.getElementById('searchPublicManualsInput')?.value || '').toLowerCase().trim();
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
            const manuals = filteredData || getManualsData();
            const tbody = document.getElementById('tableBodyManageManuals');
            const countEl = document.getElementById('countManageManuals');
            if (countEl) countEl.innerText = manuals.length;
            if (!tbody) return;

            if (manuals.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="py-12 text-center text-gray-400">
                            <i class="fa-solid fa-book-open text-4xl mb-3 text-purple-200 block"></i>
                            <p class="text-sm font-medium text-slate-600">ยังไม่มีคู่มือในระบบ</p>
                            <p class="text-xs text-slate-400 mt-1">กดปุ่ม "อัพโหลดคู่มือ" เพื่อเพิ่มเอกสารหรือภาพคู่มือใหม่</p>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = manuals.map((m, idx) => `
                <tr class="hover:bg-purple-50/40 transition-colors">
                    <td class="py-3.5 px-4 text-center font-medium text-slate-500">${idx + 1}</td>
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
        }

        function filterManageManualsTable() {
            const query = (document.getElementById('searchManageManualsInput')?.value || '').toLowerCase().trim();
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
                customClass: { popup: 'rounded-2xl' }
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
                // Fallback text document if no file attached yet
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

            if (!modal || !container) return;

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

        // ===== Purchasing Module Helper Functions =====
        let purchaseActiveTab = 'all'; // 'all' หรือ 'pending'
        let purchaseSearchQuery = '';
        let dashboardOrdersSearchQuery = '';
        let dashboardOrdersCurrentPage = 1;
        let draftOrdersSearchQuery = '';
        let manageOrdersSearchQuery = '';
        let manageOrdersSupplierFilter = '';
        let purchaseHistorySearchQuery = '';
        let purchaseHistoryCategoryFilter = '';
        let purchaseHistoryGroupFilter = '';
        let purchaseOverviewSearchQuery = '';
        let purchaseOverviewCategoryFilter = '';
        let purchaseOverviewGroupFilter = '';
        let purchaseOverviewSelectedMonths = [];
        let purchaseOverviewSelectedYears = [];
        let selectedVolatileProduct = '';
        let selectedVolatileSupplier = '';

        function openPurchaseSubSection(key, title, iconClass, gradientClass) {
            const gridEl = document.getElementById('purchase-menu-grid');
            if (gridEl) gridEl.classList.add('hidden');
            
            const subContent = document.getElementById('purchase-sub-content');
            if (subContent) subContent.classList.remove('hidden');

            const iconBg = document.getElementById('sub-sec-icon-bg');
            if (iconBg) {
                iconBg.className = "w-12 h-12 rounded-xl text-white flex items-center justify-center bg-gradient-to-br " + gradientClass;
            }
            
            const icon = document.getElementById('sub-sec-icon');
            if (icon) {
                icon.className = "fa-solid text-xl " + iconClass;
            }

            const titleEl = document.getElementById('sub-sec-title');
            if (titleEl) titleEl.innerText = title;
            
            let desc = "";
            let htmlContent = "";
            if (key === 'receive') {
                desc = "โมดูลการตรวจรับสินค้าและตรวจสอบคุณภาพ";
                htmlContent = `
                    <div class="space-y-6">
                        <!-- Sub Header Control Row -->
                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <!-- Filter Tabs -->
                            <div class="flex bg-slate-100 p-1 rounded-xl w-max border border-slate-200">
                                <button onclick="setPurchaseFilterTab('all')" id="tab-purchase-all" class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-800 shadow-sm border border-slate-200/55">
                                    ทั้งหมด
                                </button>
                                <button onclick="setPurchaseFilterTab('pending')" id="tab-purchase-pending" class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-500 hover:text-slate-800">
                                    ค้างส่ง
                                </button>
                            </div>
                            <!-- Search Field -->
                            <div class="relative max-w-sm w-full md:w-80">
                                <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <i class="fa-solid fa-magnifying-glass text-slate-400 text-xs"></i>
                                </span>
                                <input type="text" onkeyup="handlePurchaseSearch(this.value)" class="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white placeholder-slate-400 focus:outline-none transition shadow-sm" placeholder="ค้นหาด้วย PO, PR, รหัส หรือชื่อสินค้า...">
                            </div>
                        </div>

                        <!-- Data Table Container -->
                        <div class="overflow-x-auto w-full border border-slate-150 rounded-2xl shadow-sm bg-white table-scroll">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-slate-50 border-b border-slate-150 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                        <th class="p-4">PO Number</th>
                                        <th class="p-4">PR Number</th>
                                        <th class="p-4">รหัสสินค้า</th>
                                        <th class="p-4">ชื่อสินค้า</th>
                                        <th class="p-4 text-center">วันที่สั่งสินค้า</th>
                                        <th class="p-4 text-center">จำนวนที่สั่ง</th>
                                        <th class="p-4 text-center">วันที่รับล่าสุด</th>
                                        <th class="p-4 text-center">จำนวนที่รับ</th>
                                        <th class="p-4 text-center">จำนวนค้างรับ</th>
                                        <th class="p-4 text-center rounded-tr-2xl">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody id="receiveTableBody" class="divide-y divide-slate-100 text-xs text-slate-700">
                                    <!-- Rendered dynamically -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
                
                // Initialize the table body rendering
                setTimeout(() => {
                    purchaseActiveTab = 'all';
                    purchaseSearchQuery = '';
                    renderReceiveTable();
                }, 50);

            } else if (key === 'dashboard-orders') {
                desc = "ค้นหาและวิเคราะห์รายการสั่งซื้อพร้อมระดับสถานะอย่างละเอียด";
                htmlContent = `
                    <div class="space-y-6">
                        <!-- Sub Header Control Row -->
                        <div class="flex flex-col md:flex-row md:items-center justify-end gap-4">
                            <!-- Search Field -->
                            <div class="relative max-w-sm w-full md:w-80">
                                <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <i class="fa-solid fa-magnifying-glass text-slate-400 text-xs"></i>
                                </span>
                                <input type="text" onkeyup="handleDashboardOrdersSearch(this.value)" class="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 bg-white placeholder-slate-400 focus:outline-none transition shadow-sm" placeholder="ค้นหาด้วย PO, PR, รหัส หรือชื่อสินค้า...">
                            </div>
                        </div>

                        <!-- Data Table Container -->
                        <div class="overflow-x-auto w-full border border-slate-150 rounded-2xl shadow-sm bg-white table-scroll">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-slate-50 border-b border-slate-150 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                        <th class="p-4">PO Number</th>
                                        <th class="p-4">PR Number</th>
                                        <th class="p-4">รหัสสินค้า</th>
                                        <th class="p-4">ชื่อสินค้า</th>
                                        <th class="p-4 text-center">วันที่สั่งสินค้า</th>
                                        <th class="p-4 text-center">จำนวนที่สั่ง</th>
                                        <th class="p-4 text-center rounded-tr-2xl">สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody id="dashboardOrdersTableBody" class="divide-y divide-slate-100 text-xs text-slate-700">
                                    <!-- Rendered dynamically -->
                                </tbody>
                            </table>
                        </div>

                        <!-- Pagination Container -->
                        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-150 p-4 rounded-2xl shadow-sm mt-4">
                            <div id="dbOrdersPaginationInfo" class="text-xs text-slate-500 font-medium"></div>
                            <div id="dbOrdersPaginationControls" class="flex items-center gap-1"></div>
                        </div>
                    </div>
                `;
                
                // Initialize the table body rendering
                setTimeout(() => {
                    dashboardOrdersSearchQuery = '';
                    dashboardOrdersCurrentPage = 1;
                    renderDashboardOrdersTable();
                }, 50);

            } else if (key === 'add-order') {
                desc = "สร้างเอกสารขอซื้อหรือสั่งซื้อสินค้า (PR/PO)";
                htmlContent = `
                    <div class="space-y-6">
                        <!-- Sub Header Control Row -->
                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <!-- Left: Buttons -->
                            <div class="flex items-center gap-3">
                                <button onclick="handleAddOrderDraft()" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm hover:shadow-md active:scale-95">
                                    <i class="fa-solid fa-plus"></i> เพิ่มรายการ
                                </button>
                                <button onclick="exportDraftOrdersToExcel()" class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm hover:shadow-md active:scale-95">
                                    <i class="fa-solid fa-file-excel"></i> ส่งออก Excel
                                </button>
                            </div>
                            <!-- Right: Search Field -->
                            <div class="relative max-w-sm w-full md:w-80">
                                <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <i class="fa-solid fa-magnifying-glass text-slate-400 text-xs"></i>
                                </span>
                                <input type="text" onkeyup="handleDraftOrdersSearch(this.value)" class="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white placeholder-slate-400 focus:outline-none transition shadow-sm" placeholder="ค้นหาด้วยรหัส หรือชื่อสินค้า...">
                            </div>
                        </div>

                        <!-- Data Table Container -->
                        <div class="overflow-x-auto w-full border border-slate-150 rounded-2xl shadow-sm bg-white table-scroll">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-slate-50 border-b border-slate-150 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                        <th class="p-4">รหัสสินค้า</th>
                                        <th class="p-4">ชื่อสินค้า</th>
                                        <th class="p-4">Supplier</th>
                                        <th class="p-4 text-center">จำนวนที่สั่ง</th>
                                        <th class="p-4 text-center">หน่วย</th>
                                        <th class="p-4 text-center rounded-tr-2xl" style="width: 140px;">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody id="draftOrdersTableBody" class="divide-y divide-slate-100 text-xs text-slate-700">
                                    <!-- Rendered dynamically -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
                
                // Initialize the table body rendering
                setTimeout(() => {
                    draftOrdersSearchQuery = '';
                    renderDraftOrdersTable();
                }, 50);
            } else if (key === 'manage-orders') {
                desc = "ตรวจสอบความคืบหน้า อนุมัติ หรืออัปเดตใบสั่งซื้อ";
                
                // Get unique suppliers list from db.products
                const products = db.products || [];
                const suppliers = [...new Set(products.map(p => p.supplier || 'ไม่ระบุ').filter(Boolean))].sort();
                const supplierOptions = suppliers.map(s => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join('');

                htmlContent = `
                    <div class="space-y-6">
                        <!-- Sub Header Control Row -->
                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <!-- Left: Filter Dropdown -->
                            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <span class="text-xs font-semibold text-slate-500">กรองซัพพลายเออร์:</span>
                                <select onchange="handleManageOrdersSupplierFilter(this.value)" class="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-sm min-w-[200px]">
                                    <option value="">ทั้งหมด</option>
                                    ${supplierOptions}
                                </select>
                            </div>
                            <!-- Right: Search Field -->
                            <div class="relative max-w-sm w-full md:w-80">
                                <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <i class="fa-solid fa-magnifying-glass text-slate-400 text-xs"></i>
                                </span>
                                <input type="text" onkeyup="handleManageOrdersSearch(this.value)" class="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white placeholder-slate-400 focus:outline-none transition shadow-sm" placeholder="ค้นหาด้วยรหัส, ชื่อสินค้า หรือ PO/PR...">
                            </div>
                        </div>

                        <!-- Data Table Container -->
                        <div class="overflow-x-auto w-full border border-slate-150 rounded-2xl shadow-sm bg-white table-scroll">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-slate-50 border-b border-slate-150 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                        <th class="p-4">วันที่สั่งสินค้า</th>
                                        <th class="p-4">PO Number</th>
                                        <th class="p-4">PR Number</th>
                                        <th class="p-4">รหัสสินค้า</th>
                                        <th class="p-4">ชื่อสินค้า</th>
                                        <th class="p-4">Supplier</th>
                                        <th class="p-4 text-center">จำนวนที่สั่ง</th>
                                        <th class="p-4 text-right">ราคา/หน่วย</th>
                                        <th class="p-4 text-right">ราคารวม</th>
                                        <th class="p-4 text-center rounded-tr-2xl" style="width: 110px;">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody id="manageOrdersTableBody" class="divide-y divide-slate-100 text-xs text-slate-700">
                                    <!-- Rendered dynamically -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
                
                // Initialize the table body rendering
                setTimeout(() => {
                    manageOrdersSearchQuery = '';
                    manageOrdersSupplierFilter = '';
                    renderManageOrdersTable();
                }, 50);
            } else if (key === 'history') {
                desc = "ประวัติและรายการสั่งซื้อที่ทำเสร็จสิ้นแล้ว";
                
                const isAdmin = currentUser && currentUser.role === 'ADMIN';
                
                // Get unique categories and groups for filter dropdowns
                const products = db.products || [];
                const categories = [...new Set(products.map(p => p.category || 'ไม่ระบุ').filter(Boolean))].sort();
                const categoryOptions = categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');

                const groups = [...new Set(products.map(p => p.group || 'ไม่ระบุ').filter(Boolean))].sort();
                const groupOptions = groups.map(g => `<option value="${escapeHTML(g)}">${escapeHTML(g)}</option>`).join('');

                htmlContent = `
                    <div class="space-y-6">
                        <!-- Search and Filter Row -->
                        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <!-- Left Filters -->
                            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-semibold text-slate-500">ประเภทอะไหล่:</span>
                                    <select onchange="handleHistoryCategoryFilter(this.value)" class="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-sm min-w-[150px]">
                                        <option value="">ทั้งหมด</option>
                                        ${categoryOptions}
                                    </select>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-semibold text-slate-500">กลุ่มสินค้า:</span>
                                    <select onchange="handleHistoryGroupFilter(this.value)" class="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-sm min-w-[150px]">
                                        <option value="">ทั้งหมด</option>
                                        ${groupOptions}
                                    </select>
                                </div>
                                ${isAdmin ? `
                                <button onclick="deleteAllPurchaseHistory()" class="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition shadow-sm hover:shadow-md active:scale-95 self-start">
                                    <i class="fa-solid fa-trash-can"></i> ลบประวัติทั้งหมด
                                </button>
                                ` : ''}
                            </div>
                            <!-- Right Search -->
                            <div class="relative max-w-sm w-full lg:w-80">
                                <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <i class="fa-solid fa-magnifying-glass text-slate-400 text-xs"></i>
                                </span>
                                <input type="text" onkeyup="handleHistorySearch(this.value)" class="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white placeholder-slate-400 focus:outline-none transition shadow-sm" placeholder="ค้นหา PO, PR, รหัสสินค้า, ชื่อสินค้า...">
                            </div>
                        </div>

                        <!-- Cards Container -->
                        <div id="purchaseHistoryCardsContainer" class="space-y-4">
                            <!-- Cards rendered dynamically -->
                        </div>
                    </div>
                `;

                setTimeout(() => {
                    purchaseHistorySearchQuery = '';
                    purchaseHistoryCategoryFilter = '';
                    purchaseHistoryGroupFilter = '';
                    renderPurchaseHistoryCards();
                }, 50);
            } else if (key === 'overview') {
                desc = "ภาพรวมงบประมาณจัดซื้อและสถิติยอดซื้อ";
                
                const products = db.products || [];
                const categories = [...new Set(products.map(p => p.category || 'ไม่ระบุ').filter(Boolean))].sort();
                const categoryOptions = categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');

                const groups = [...new Set(products.map(p => p.group || 'ไม่ระบุ').filter(Boolean))].sort();
                const groupOptions = groups.map(g => `<option value="${escapeHTML(g)}">${escapeHTML(g)}</option>`).join('');

                const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                const monthButtons = monthNames.map((name, index) => {
                    const monthVal = String(index + 1).padStart(2, '0');
                    return `
                        <button onclick="toggleOverviewMonth('${monthVal}', this)" id="btn-overview-month-${monthVal}" class="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition active:scale-95 shadow-sm">
                            ${name}
                        </button>
                    `;
                }).join('');

                // Get dynamic years from purchaseOrders
                const orders = db.purchaseOrders || [];
                const yearsList = [...new Set(orders.map(o => o.orderDate ? o.orderDate.split('-')[0] : '').filter(Boolean))].sort();
                if (yearsList.length === 0) {
                    yearsList.push(new Date().getFullYear().toString());
                }
                const yearButtons = yearsList.map(y => `
                    <button onclick="toggleOverviewYear('${y}', this)" id="btn-overview-year-${y}" class="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition active:scale-95 shadow-sm">
                        ${y}
                    </button>
                `).join('');

                htmlContent = `
                    <div class="space-y-6">
                        <!-- Filters Header Card -->
                        <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                            <!-- Search, Category, Group -->
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label class="block text-[11px] font-semibold text-slate-500 mb-1.5">ค้นหาอะไหล่:</label>
                                    <div class="relative">
                                        <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                            <i class="fa-solid fa-magnifying-glass text-slate-400 text-xs"></i>
                                        </span>
                                        <input type="text" id="overview-search-input" onkeyup="handleOverviewSearch(this.value)" class="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-slate-50/50 placeholder-slate-400 focus:outline-none transition shadow-sm" placeholder="ค้นหาด้วยรหัส หรือชื่อสินค้า...">
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-[11px] font-semibold text-slate-500 mb-1.5">ประเภทอะไหล่:</label>
                                    <select onchange="handleOverviewCategory(this.value)" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-sm">
                                        <option value="">ทั้งหมด</option>
                                        ${categoryOptions}
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[11px] font-semibold text-slate-500 mb-1.5">กลุ่มสินค้า:</label>
                                    <select onchange="handleOverviewGroup(this.value)" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-sm">
                                        <option value="">ทั้งหมด</option>
                                        ${groupOptions}
                                    </select>
                                </div>
                            </div>

                            <!-- Months Selection -->
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <span class="text-[11px] font-semibold text-slate-500">เลือกเดือน (เลือกได้หลายเดือน):</span>
                                    <div class="space-x-2">
                                        <button onclick="selectOverviewAllMonths(true)" class="text-[10px] text-blue-600 hover:underline font-bold">เลือกทั้งหมด</button>
                                        <span class="text-slate-300">|</span>
                                        <button onclick="selectOverviewAllMonths(false)" class="text-[10px] text-slate-500 hover:underline font-bold">ล้างทั้งหมด</button>
                                    </div>
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    ${monthButtons}
                                </div>
                            </div>

                            <!-- Years Selection -->
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <span class="text-[11px] font-semibold text-slate-500">เลือกปี (เลือกได้หลายปี):</span>
                                    <div class="space-x-2">
                                        <button onclick="selectOverviewAllYears(true)" class="text-[10px] text-blue-600 hover:underline font-bold">เลือกทั้งหมด</button>
                                        <span class="text-slate-300">|</span>
                                        <button onclick="selectOverviewAllYears(false)" class="text-[10px] text-slate-500 hover:underline font-bold">ล้างทั้งหมด</button>
                                    </div>
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    ${yearButtons}
                                </div>
                            </div>
                        </div>

                        <!-- CORE STAT CARDS -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4" id="overview-stat-cards">
                            <!-- Populated by JS -->
                        </div>

                        <!-- LINE CHART & MONTHLY COMPARISON CARD -->
                        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            <!-- SVG Line Chart (Left 2 cols) -->
                            <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm xl:col-span-2 space-y-4">
                                <h3 class="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                    <i class="fa-solid fa-chart-line text-blue-500"></i> กราฟเส้นเปรียบเทียบมูลค่าการสั่งซื้อรายเดือน
                                </h3>
                                <div id="overview-chart-container" class="relative w-full h-80 flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden">
                                    <!-- Rendered dynamically as SVG -->
                                </div>
                            </div>

                            <!-- Monthly Comparisons Table (Right 1 col) -->
                            <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                                <h3 class="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                    <i class="fa-solid fa-calendar-days text-purple-500"></i> แนวโน้มเปรียบเทียบรายเดือน
                                </h3>
                                <div class="overflow-y-auto max-h-[320px] pr-1 scrollbar-thin space-y-3" id="overview-monthly-comparison-list">
                                    <!-- Rendered dynamically as cards -->
                                </div>
                            </div>
                        </div>

                        <!-- PRODUCT & SUPPLIER PRICE ANALYTICS SECTION -->
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <!-- Product Price Analysis -->
                            <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                                <div class="flex items-center justify-between gap-2">
                                    <h3 class="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                        <i class="fa-solid fa-tags text-amber-500"></i> วิเคราะห์ความเคลื่อนไหวราคาอะไหล่
                                    </h3>
                                    <!-- Selector to drill down -->
                                    <select id="overview-drill-product-select" onchange="drillProductPriceTrend(this.value)" class="px-2 py-1 text-[10px] border border-slate-200 rounded-lg max-w-[180px] bg-white focus:outline-none shadow-sm">
                                        <option value="">เลือกสินค้าเพื่อวิเคราะห์...</option>
                                    </select>
                                </div>

                                <!-- Drill Down Timeline container -->
                                <div id="product-drilldown-timeline" class="hidden bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2 max-h-48 overflow-y-auto">
                                    <!-- Timeline rows rendered dynamically -->
                                </div>

                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <!-- Top 10 Price Down -->
                                    <div class="space-y-2">
                                        <h4 class="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                            <i class="fa-solid fa-arrow-down-long"></i> 10 อันดับ ราคาลงมากสุด
                                        </h4>
                                        <div class="overflow-x-auto border border-slate-100 rounded-xl bg-white max-h-60 overflow-y-auto table-scroll">
                                            <table class="w-full text-left text-[10px] border-collapse">
                                                <thead>
                                                    <tr class="bg-slate-50 border-b border-slate-100 font-bold text-slate-500">
                                                        <th class="p-2">สินค้า</th>
                                                        <th class="p-2 text-right">ลดลง</th>
                                                        <th class="p-2 text-right">%</th>
                                                    </tr>
                                                </thead>
                                                <tbody id="top-product-downs">
                                                    <!-- Dynamic rows -->
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <!-- Top 10 Price Up -->
                                    <div class="space-y-2">
                                        <h4 class="text-xs font-bold text-rose-600 flex items-center gap-1">
                                            <i class="fa-solid fa-arrow-up-long"></i> 10 อันดับ ราคาขึ้นมากสุด
                                        </h4>
                                        <div class="overflow-x-auto border border-slate-100 rounded-xl bg-white max-h-60 overflow-y-auto table-scroll">
                                            <table class="w-full text-left text-[10px] border-collapse">
                                                <thead>
                                                    <tr class="bg-slate-50 border-b border-slate-100 font-bold text-slate-500">
                                                        <th class="p-2">สินค้า</th>
                                                        <th class="p-2 text-right">เพิ่มขึ้น</th>
                                                        <th class="p-2 text-right">%</th>
                                                    </tr>
                                                </thead>
                                                <tbody id="top-product-ups">
                                                    <!-- Dynamic rows -->
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Supplier Price Analysis -->
                            <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                                <div class="flex items-center justify-between gap-2">
                                    <h3 class="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                        <i class="fa-solid fa-handshake text-indigo-500"></i> วิเคราะห์ความผันผวนราคาคู่ค้า (Supplier)
                                    </h3>
                                    <!-- Selector to drill down -->
                                    <select id="overview-drill-supplier-select" onchange="drillSupplierPriceTrend(this.value)" class="px-2 py-1 text-[10px] border border-slate-200 rounded-lg max-w-[180px] bg-white focus:outline-none shadow-sm">
                                        <option value="">เลือก Supplier...</option>
                                    </select>
                                </div>

                                <!-- Drill Down Timeline container -->
                                <div id="supplier-drilldown-timeline" class="hidden bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2 max-h-48 overflow-y-auto">
                                    <!-- Timeline rows rendered dynamically -->
                                </div>

                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <!-- Top 10 Supplier Price Down -->
                                    <div class="space-y-2">
                                        <h4 class="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                            <i class="fa-solid fa-arrow-down-long"></i> 10 อันดับ Supplier ราคาลดลง
                                        </h4>
                                        <div class="overflow-x-auto border border-slate-100 rounded-xl bg-white max-h-60 overflow-y-auto table-scroll">
                                            <table class="w-full text-left text-[10px] border-collapse">
                                                <thead>
                                                    <tr class="bg-slate-50 border-b border-slate-100 font-bold text-slate-500">
                                                        <th class="p-2">Supplier</th>
                                                        <th class="p-2 text-right">ลดลงเฉลี่ย</th>
                                                        <th class="p-2 text-right">%</th>
                                                    </tr>
                                                </thead>
                                                <tbody id="top-supplier-downs">
                                                    <!-- Dynamic rows -->
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <!-- Top 10 Supplier Price Up -->
                                    <div class="space-y-2">
                                        <h4 class="text-xs font-bold text-rose-600 flex items-center gap-1">
                                            <i class="fa-solid fa-arrow-up-long"></i> 10 อันดับ Supplier ราคาเพิ่มขึ้น
                                        </h4>
                                        <div class="overflow-x-auto border border-slate-100 rounded-xl bg-white max-h-60 overflow-y-auto table-scroll">
                                            <table class="w-full text-left text-[10px] border-collapse">
                                                <thead>
                                                    <tr class="bg-slate-50 border-b border-slate-100 font-bold text-slate-500">
                                                        <th class="p-2">Supplier</th>
                                                        <th class="p-2 text-right">เพิ่มเฉลี่ย</th>
                                                        <th class="p-2 text-right">%</th>
                                                    </tr>
                                                </thead>
                                                <tbody id="top-supplier-ups">
                                                    <!-- Dynamic rows -->
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                setTimeout(() => {
                    purchaseOverviewSearchQuery = '';
                    purchaseOverviewCategoryFilter = '';
                    purchaseOverviewGroupFilter = '';
                    purchaseOverviewSelectedMonths = []; // empty = all
                    purchaseOverviewSelectedYears = []; // empty = all
                    
                    // Highlight initially all months/years buttons
                    selectOverviewAllMonths(true);
                    selectOverviewAllYears(true);
                    
                    renderPurchaseOverviewDashboard();
                }, 50);
            }

            const subtitleEl = document.getElementById('sub-sec-subtitle');
            if (subtitleEl) subtitleEl.innerText = desc;
            
            const bodyEl = document.getElementById('sub-sec-body');
            if (bodyEl) {
                if (key === 'receive' || key === 'dashboard-orders' || key === 'add-order' || key === 'manage-orders' || key === 'history') {
                    bodyEl.className = "w-full text-left text-slate-700";
                } else {
                    bodyEl.className = "flex flex-col items-center justify-center py-12 text-center text-slate-400";
                }
                bodyEl.innerHTML = htmlContent;
            }
        }

        function closePurchaseSubSection() {
            const subContent = document.getElementById('purchase-sub-content');
            if (subContent) subContent.classList.add('hidden');
            
            const gridEl = document.getElementById('purchase-menu-grid');
            if (gridEl) gridEl.classList.remove('hidden');

            const bodyEl = document.getElementById('sub-sec-body');
            if (bodyEl) {
                bodyEl.className = "flex flex-col items-center justify-center py-12 text-center text-slate-400";
                bodyEl.innerHTML = `
                    <div class="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 text-3xl mb-4 border border-dashed border-slate-200">
                        <i class="fa-solid fa-helmet-safety"></i>
                    </div>
                    <h4 class="text-slate-700 font-bold text-sm">ระบบส่วนงานนี้อยู่ระหว่างการเตรียมความพร้อม</h4>
                    <p class="text-slate-400 text-xs mt-1 max-w-sm leading-relaxed">โมดูลนี้ได้รับการเชื่อมโยงแล้ว ทีมพัฒนากำลังดำเนินการติดตั้งฐานข้อมูลและหน้าอินเตอร์เฟสสำหรับการใช้งานจริง</p>
                `;
            }
        }

        function setPurchaseFilterTab(tab) {
            purchaseActiveTab = tab;
            const btnAll = document.getElementById('tab-purchase-all');
            const btnPending = document.getElementById('tab-purchase-pending');
            if (tab === 'all') {
                if (btnAll) btnAll.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-800 shadow-sm border border-slate-200/50";
                if (btnPending) btnPending.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-500 hover:text-slate-800";
            } else {
                if (btnPending) btnPending.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-800 shadow-sm border border-slate-200/50";
                if (btnAll) btnAll.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-500 hover:text-slate-800";
            }
            renderReceiveTable();
        }

        function handlePurchaseSearch(val) {
            purchaseSearchQuery = val.trim().toLowerCase();
            renderReceiveTable();
        }

        function handleDashboardOrdersSearch(val) {
            dashboardOrdersSearchQuery = val.trim().toLowerCase();
            dashboardOrdersCurrentPage = 1;
            renderDashboardOrdersTable();
        }

        function renderReceiveTable() {
            const tableBody = document.getElementById('receiveTableBody');
            if (!tableBody) return;

            const isAdmin = currentUser && currentUser.role === 'ADMIN';
            const orders = db.purchaseOrders || [];
            
            // Filter: show only items with status "สั่งแล้ว" or "ค้างส่ง"
            let filtered = orders.filter(o => o.status === "สั่งแล้ว" || o.status === "ค้างส่ง");

            // Sort by orderDate descending, then by poNumber descending (latest first)
            filtered.sort((a, b) => {
                const dateA = a.orderDate || '';
                const dateB = b.orderDate || '';
                if (dateA !== dateB) return dateB.localeCompare(dateA);
                const poA = a.poNumber || '';
                const poB = b.poNumber || '';
                return poB.localeCompare(poA);
            });

            // Filter by active tab: if "pending" (ค้างส่ง), show items where status is "ค้างส่ง"
            if (purchaseActiveTab === 'pending') {
                filtered = filtered.filter(o => o.status === "ค้างส่ง");
            }

            // Filter by search query
            if (purchaseSearchQuery) {
                filtered = filtered.filter(o => 
                    o.poNumber.toLowerCase().includes(purchaseSearchQuery) ||
                    o.prNumber.toLowerCase().includes(purchaseSearchQuery) ||
                    o.productId.toLowerCase().includes(purchaseSearchQuery) ||
                    o.productName.toLowerCase().includes(purchaseSearchQuery)
                );
            }

            if (filtered.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="10" class="p-12 text-center text-slate-400">
                            <div class="flex flex-col items-center justify-center">
                                <i class="fa-solid fa-boxes-packing text-slate-200 text-4xl mb-2"></i>
                                <p class="text-sm font-bold text-slate-500">ไม่พบรายการค้างรับสินค้า</p>
                                <p class="text-xs text-slate-400 mt-0.5">รายการสั่งซื้อทั้งหมดได้รับการจัดส่งครบถ้วน หรือไม่ตรงกับเงื่อนไขการค้นหา</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            tableBody.innerHTML = '';
            filtered.forEach(o => {
                const pendingQty = o.orderedQty - o.receivedQty;
                const rowHtml = `
                    <tr class="hover:bg-slate-50/80 transition-colors">
                        <td class="p-4 font-bold text-slate-800 font-mono tracking-wider">${escapeHTML(o.poNumber)}</td>
                        <td class="p-4 text-slate-600 font-mono">${escapeHTML(o.prNumber)}</td>
                        <td class="p-4 text-slate-500 font-mono text-[11px]">${escapeHTML(o.productId)}</td>
                        <td class="p-4 font-semibold text-slate-800">${escapeHTML(o.productName)}</td>
                        <td class="p-4 text-center text-slate-500">${escapeHTML(o.orderDate)}</td>
                        <td class="p-4 text-center font-bold text-slate-700">${o.orderedQty}</td>
                        <td class="p-4 text-center text-slate-500">${o.lastReceivedDate ? escapeHTML(o.lastReceivedDate) : '-'}</td>
                        <td class="p-4 text-center font-bold text-emerald-600">${o.receivedQty}</td>
                        <td class="p-4 text-center font-extrabold text-rose-600 bg-rose-50/30">${pendingQty}</td>
                        <td class="p-4 text-center">
                            <div class="flex items-center justify-center gap-2">
                                <button onclick="handleReceiveGoods('${escapeForJS(o.poNumber)}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] transition shadow-sm hover:shadow-md active:scale-95">
                                    <i class="fa-solid fa-square-check"></i> รับสินค้า
                                </button>
                                ${isAdmin ? `
                                <button onclick="deleteActivePurchaseOrder('${escapeForJS(o.poNumber)}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white font-bold rounded-xl text-[11px] transition border border-rose-100 hover:border-rose-600 shadow-sm active:scale-95">
                                    <i class="fa-solid fa-trash-can"></i> ลบ
                                </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', rowHtml);
            });
        }

        function renderDashboardOrdersTable() {
            const tableBody = document.getElementById('dashboardOrdersTableBody');
            if (!tableBody) return;

            const orders = db.purchaseOrders || [];
            let filtered = [...orders];

            // Sort by orderDate descending, then by poNumber descending (latest first)
            filtered.sort((a, b) => {
                const dateA = a.orderDate || '';
                const dateB = b.orderDate || '';
                if (dateA !== dateB) return dateB.localeCompare(dateA);
                const poA = a.poNumber || '';
                const poB = b.poNumber || '';
                return poB.localeCompare(poA);
            });

            // Filter by search query
            if (dashboardOrdersSearchQuery) {
                filtered = filtered.filter(o => 
                    o.poNumber.toLowerCase().includes(dashboardOrdersSearchQuery) ||
                    o.prNumber.toLowerCase().includes(dashboardOrdersSearchQuery) ||
                    o.productId.toLowerCase().includes(dashboardOrdersSearchQuery) ||
                    o.productName.toLowerCase().includes(dashboardOrdersSearchQuery)
                );
            }

            const infoEl = document.getElementById('dbOrdersPaginationInfo');
            const controlsEl = document.getElementById('dbOrdersPaginationControls');

            if (filtered.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="p-12 text-center text-slate-400">
                            <div class="flex flex-col items-center justify-center">
                                <i class="fa-solid fa-receipt text-slate-200 text-4xl mb-2"></i>
                                <p class="text-sm font-bold text-slate-500">ไม่พบข้อมูลคำสั่งซื้อ</p>
                                <p class="text-xs text-slate-400 mt-0.5">กรุณาปรับคำค้นหาหรือเพิ่มคำสั่งซื้อเข้าระบบ</p>
                            </div>
                        </td>
                    </tr>
                `;
                if (infoEl) infoEl.innerText = "ไม่พบรายการคำสั่งซื้อ";
                if (controlsEl) controlsEl.innerHTML = '';
                return;
            }

            // Pagination calculation
            const pageSize = 20;
            const totalItems = filtered.length;
            const totalPages = Math.ceil(totalItems / pageSize);

            if (dashboardOrdersCurrentPage > totalPages) dashboardOrdersCurrentPage = totalPages;
            if (dashboardOrdersCurrentPage < 1) dashboardOrdersCurrentPage = 1;

            const startIndex = (dashboardOrdersCurrentPage - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const pageOrders = filtered.slice(startIndex, endIndex);

            tableBody.innerHTML = '';
            pageOrders.forEach(o => {
                let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                if (o.status === 'รออนุมัติ') badgeColor = 'bg-amber-50 text-amber-700 border border-amber-200';
                else if (o.status === 'สั่งแล้ว') badgeColor = 'bg-blue-50 text-blue-700 border border-blue-200';
                else if (o.status === 'ค้างส่ง') badgeColor = 'bg-red-50 text-red-700 border border-red-200';
                else if (o.status === 'ได้รับครบ') badgeColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200';

                const rowHtml = `
                    <tr onclick="showDashboardOrderDetailModal('${escapeForJS(o.poNumber)}', '${escapeForJS(o.productId)}')" class="hover:bg-slate-50/80 transition-colors cursor-pointer">
                        <td class="p-4 font-bold text-slate-800 font-mono tracking-wider">${escapeHTML(o.poNumber)}</td>
                        <td class="p-4 text-slate-600 font-mono">${escapeHTML(o.prNumber)}</td>
                        <td class="p-4 text-slate-500 font-mono text-[11px]">${escapeHTML(o.productId)}</td>
                        <td class="p-4 font-semibold text-slate-800">${escapeHTML(o.productName)}</td>
                        <td class="p-4 text-center text-slate-500">${escapeHTML(o.orderDate)}</td>
                        <td class="p-4 text-center font-bold text-slate-700">${o.orderedQty}</td>
                        <td class="p-4 text-center">
                            <span class="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-md uppercase ${badgeColor}">
                                ${escapeHTML(o.status)}
                            </span>
                        </td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', rowHtml);
            });

            renderDashboardOrdersPagination(totalItems, dashboardOrdersCurrentPage, totalPages);
        }

        function renderDashboardOrdersPagination(totalItems, currentPage, totalPages) {
            const infoEl = document.getElementById('dbOrdersPaginationInfo');
            const controlsEl = document.getElementById('dbOrdersPaginationControls');
            if (!infoEl || !controlsEl) return;

            if (totalItems === 0) {
                infoEl.innerText = "ไม่พบรายการคำสั่งซื้อ";
                controlsEl.innerHTML = '';
                return;
            }

            const pageSize = 20;
            const startItem = (currentPage - 1) * pageSize + 1;
            const endItem = Math.min(currentPage * pageSize, totalItems);
            infoEl.innerHTML = `แสดง <span class="font-bold text-slate-800">${startItem} - ${endItem}</span> จากทั้งหมด <span class="font-bold text-slate-800">${totalItems}</span> รายการ (หน้า <span class="font-bold text-indigo-600">${currentPage}</span> / ${totalPages})`;

            let buttonsHtml = '';

            // First page <<
            buttonsHtml += `
                <button onclick="changeDashboardOrdersPage(1)" ${currentPage === 1 ? 'disabled class="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed border border-gray-200"' : 'class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm"'} title="หน้าแรก">
                    <i class="fa-solid fa-angles-left"></i>
                </button>
            `;

            // Prev page <
            buttonsHtml += `
                <button onclick="changeDashboardOrdersPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled class="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed border border-gray-200"' : 'class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm"'} title="หน้าก่อนหน้า">
                    <i class="fa-solid fa-angle-left mr-1"></i> ก่อนหน้า
                </button>
            `;

            // Page numbers
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, currentPage + 2);

            if (startPage > 1) {
                buttonsHtml += `<button onclick="changeDashboardOrdersPage(1)" class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition shadow-sm">1</button>`;
                if (startPage > 2) {
                    buttonsHtml += `<span class="px-1 text-gray-400 text-xs font-bold">...</span>`;
                }
            }

            for (let p = startPage; p <= endPage; p++) {
                if (p === currentPage) {
                    buttonsHtml += `<button class="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-extrabold shadow-md shadow-indigo-500/20 cursor-default">${p}</button>`;
                } else {
                    buttonsHtml += `<button onclick="changeDashboardOrdersPage(${p})" class="px-3.5 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm">${p}</button>`;
                }
            }

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    buttonsHtml += `<span class="px-1 text-gray-400 text-xs font-bold">...</span>`;
                }
                buttonsHtml += `<button onclick="changeDashboardOrdersPage(${totalPages})" class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition shadow-sm">${totalPages}</button>`;
            }

            // Next page >
            buttonsHtml += `
                <button onclick="changeDashboardOrdersPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled class="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed border border-gray-200"' : 'class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm"'} title="หน้าถัดไป">
                    ถัดไป <i class="fa-solid fa-angle-right ml-1"></i>
                </button>
            `;

            // Last page >>
            buttonsHtml += `
                <button onclick="changeDashboardOrdersPage(${totalPages})" ${currentPage === totalPages ? 'disabled class="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed border border-gray-200"' : 'class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm"'} title="หน้าสุดท้าย">
                    <i class="fa-solid fa-angles-right"></i>
                </button>
            `;

            controlsEl.innerHTML = buttonsHtml;
        }

        window.changeDashboardOrdersPage = function(p) {
            dashboardOrdersCurrentPage = p;
            renderDashboardOrdersTable();
        };

        window.showDashboardOrderDetailModal = function(poNumber, productId) {
            const orders = db.purchaseOrders || [];
            const order = orders.find(o => String(o.poNumber).trim() === String(poNumber).trim() && String(o.productId).trim() === String(productId).trim());
            if (!order) return;

            const prod = db.products ? db.products.find(p => String(p.id).trim() === String(productId).trim()) : null;
            const unit = prod ? (prod.unit || 'ชิ้น') : 'ชิ้น';
            const supplier = order.supplier || (prod ? (prod.supplier || 'ไม่ระบุ') : 'ไม่ระบุ');
            
            const pendingQty = Math.max(0, order.orderedQty - order.receivedQty);
            const hasPending = pendingQty > 0;
            
            let statusColor = 'text-slate-600 bg-slate-100';
            if (order.status === 'รออนุมัติ') statusColor = 'text-amber-700 bg-amber-50 border-amber-200';
            else if (order.status === 'สั่งแล้ว') statusColor = 'text-blue-700 bg-blue-50 border-blue-200';
            else if (order.status === 'ค้างส่ง') statusColor = 'text-red-700 bg-red-50 border-red-200';
            else if (order.status === 'ได้รับครบ') statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';

            Swal.fire({
                title: '<i class="fa-solid fa-circle-info text-indigo-600 mr-2"></i>รายละเอียดคำสั่งซื้อ',
                html: `
                    <div class="space-y-4 text-left text-xs text-slate-700">
                        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                            <h4 class="font-bold text-slate-800 text-sm">${escapeHTML(order.productName)}</h4>
                            <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-slate-500">
                                <div><span class="text-slate-400">รหัสสินค้า:</span> <span class="font-bold font-mono text-slate-700">${escapeHTML(order.productId)}</span></div>
                                <div><span class="text-slate-400">หน่วยนับ:</span> <span class="font-bold text-slate-700">${escapeHTML(unit)}</span></div>
                                <div class="col-span-2"><span class="text-slate-400">ซัพพลายเออร์ (Supplier):</span> <span class="font-bold text-slate-800 text-xs">${escapeHTML(supplier)}</span></div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3 text-center">
                            <div class="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                                <span class="text-[9px] text-slate-400 font-semibold uppercase block">เลขที่ PO</span>
                                <span class="font-bold font-mono text-slate-700 text-xs">${escapeHTML(order.poNumber.startsWith('PO-DRF-') ? 'ดราฟต์' : order.poNumber)}</span>
                            </div>
                            <div class="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                                <span class="text-[9px] text-slate-400 font-semibold uppercase block">เลขที่ PR</span>
                                <span class="font-bold font-mono text-slate-700 text-xs">${escapeHTML(order.prNumber === 'PR-DRAFT' ? 'ดราฟต์' : (order.prNumber || '-'))}</span>
                            </div>
                        </div>

                        <div class="grid grid-cols-3 gap-2.5 text-center">
                            <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                                <span class="text-[9px] text-slate-400 font-semibold uppercase block">จำนวนที่สั่ง</span>
                                <span class="text-sm font-extrabold text-slate-800">${order.orderedQty} ${escapeHTML(unit)}</span>
                            </div>
                            <div class="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                                <span class="text-[9px] text-emerald-500 font-semibold uppercase block">รับเข้าแล้ว</span>
                                <span class="text-sm font-extrabold text-emerald-600">${order.receivedQty} ${escapeHTML(unit)}</span>
                            </div>
                            <div class="${hasPending ? 'bg-rose-50 border border-rose-100' : 'bg-slate-50 border border-slate-200'} p-3 rounded-xl">
                                <span class="text-[9px] ${hasPending ? 'text-rose-500' : 'text-slate-400'} font-semibold uppercase block">ค้างรับ</span>
                                <span class="text-sm font-extrabold ${hasPending ? 'text-rose-600' : 'text-slate-500'}">${pendingQty} ${escapeHTML(unit)}</span>
                            </div>
                        </div>

                        <div class="flex items-center justify-between bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl">
                            <span class="text-slate-400 font-semibold">สถานะรายการ:</span>
                            <span class="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-md uppercase border ${statusColor}">
                                ${escapeHTML(order.status)}
                            </span>
                        </div>
                    </div>
                `,
                confirmButtonText: 'ปิดหน้าต่าง',
                confirmButtonColor: '#4f46e5',
                customClass: {
                    popup: 'rounded-2xl w-full max-w-sm',
                    confirmButton: 'rounded-xl font-semibold !text-xs',
                }
            });
        }

        function handleReceiveGoods(poNumber) {
            const orders = db.purchaseOrders || [];
            const order = orders.find(o => o.poNumber === poNumber);
            if (!order) {
                showToast("ไม่พบรายการใบสั่งซื้อนี้", "error");
                return;
            }

            const pendingQty = order.orderedQty - order.receivedQty;
            const prod = db.products ? db.products.find(p => String(p.id).trim().toLowerCase() === String(order.productId).trim().toLowerCase()) : null;
            const unit = prod ? (prod.unit || 'ชิ้น') : 'ชิ้น';
            const supplier = order.supplier || (prod ? (prod.supplier || 'ไม่ระบุ') : 'ไม่ระบุ');

            Swal.fire({
                title: '<i class="fa-solid fa-boxes-packing text-emerald-500 mr-2"></i>บันทึกการรับสินค้าเข้าคลัง',
                html: `
                    <div class="space-y-4 text-left text-xs">
                        <div class="bg-slate-50 p-3 rounded-xl border border-gray-150 flex gap-2.5 items-center mb-3">
                            <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                <i class="fa-solid fa-receipt"></i>
                            </div>
                            <div class="min-w-0">
                                <p class="text-[10px] text-gray-400">เลขที่ใบสั่งซื้อ (PO)</p>
                                <p class="font-mono font-bold text-slate-700 truncate">${escapeHTML(order.poNumber)} (${escapeHTML(order.prNumber)})</p>
                            </div>
                        </div>
                        <div class="bg-slate-50 p-3 rounded-xl border border-gray-150 mb-3 space-y-2">
                            <div>
                                <p class="text-[10px] text-gray-400">รายการอะไหล่</p>
                                <p class="font-bold text-slate-700 mt-0.5">${escapeHTML(order.productName)}</p>
                                <p class="text-[10px] text-slate-500 font-mono">รหัส: ${escapeHTML(order.productId)}</p>
                            </div>
                            <div class="pt-2 border-t border-slate-200/60">
                                <p class="text-[10px] text-gray-400">ซัพพลายเออร์ที่ซื้อ</p>
                                <p class="font-bold text-slate-700 mt-0.5">${escapeHTML(supplier)}</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-3 gap-3 text-center mb-4">
                            <div class="bg-white border border-slate-200 p-2.5 rounded-xl">
                                <p class="text-[9px] text-slate-400 font-semibold uppercase">จำนวนที่สั่ง</p>
                                <p class="text-base font-extrabold text-slate-700 mt-0.5">${order.orderedQty}</p>
                            </div>
                            <div class="bg-white border border-slate-200 p-2.5 rounded-xl">
                                <p class="text-[9px] text-emerald-500 font-semibold uppercase">รับเข้าแล้ว</p>
                                <p class="text-base font-extrabold text-emerald-600 mt-0.5">${order.receivedQty}</p>
                            </div>
                            <div class="bg-white border border-slate-200 p-2.5 rounded-xl">
                                <p class="text-[9px] text-rose-500 font-semibold uppercase">ยอดค้างรับ</p>
                                <p class="text-base font-extrabold text-rose-600 mt-0.5">${pendingQty}</p>
                            </div>
                        </div>
                        <div>
                            <label class="block font-semibold text-gray-600 mb-1.5">จำนวนสินค้าที่ได้รับครั้งนี้ (${escapeHTML(unit)})</label>
                            <input type="number" id="swal-receive-qty" min="1" max="${pendingQty}" value="" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="ระบุจำนวน${escapeHTML(unit)}ที่ส่งมอบ">
                        </div>
                    </div>
                `,
                confirmButtonText: '<i class="fa-solid fa-save mr-1.5"></i>บันทึกการรับเข้า',
                confirmButtonColor: '#10b981',
                showCancelButton: true,
                cancelButtonText: 'ยกเลิก',
                cancelButtonColor: '#6b7280',
                reverseButtons: true,
                focusConfirm: false,
                customClass: {
                    popup: 'rounded-2xl',
                    confirmButton: 'rounded-xl font-semibold !text-xs',
                    cancelButton: 'rounded-xl font-semibold !text-xs',
                },
                preConfirm: () => {
                    const receiveInput = document.getElementById('swal-receive-qty');
                    const receiveVal = parseFloat(receiveInput.value);
                    if (isNaN(receiveVal) || receiveVal <= 0) {
                        Swal.showValidationMessage('กรุณากรอกจำนวนที่ถูกต้อง (มากกว่า 0)');
                        return false;
                    }
                    if (receiveVal > pendingQty) {
                        Swal.showValidationMessage(`จำนวนรับเข้าเกินยอดค้างส่ง (${pendingQty} ${unit})`);
                        return false;
                    }
                    return receiveVal;
                }
            }).then(async (result) => {
                if (result.isConfirmed && result.value) {
                    const receivedAmount = result.value;
                    
                    showLoading("กำลังบันทึกการรับสินค้า...");
                    try {
                        const payload = {
                            poNumber: poNumber,
                            receivedAmount: receivedAmount,
                            requester: currentUser ? currentUser.fullName : "เจ้าหน้าที่สโตว์",
                            department: currentUser ? currentUser.department : "จัดซื้อ"
                        };
                        const res = await fetch(API_URL, {
                            method: 'POST',
                            body: JSON.stringify({ action: 'receivePurchaseGoods', payload: payload })
                        });
                        const resultData = await res.json();
                        if (resultData.status === 'success') {
                            showToast(`บันทึกรับสินค้าสำเร็จ +${receivedAmount} ${unit}!`, 'success');
                            await fetchData(true); // force refresh database
                            
                            // Re-render current view depending on which element is open
                            const receiveTableBody = document.getElementById('receiveTableBody');
                            if (receiveTableBody) {
                                renderReceiveTable();
                            }
                            const dashboardOrdersTableBody = document.getElementById('dashboardOrdersTableBody');
                            if (dashboardOrdersTableBody) {
                                renderDashboardOrdersTable();
                            }
                        } else {
                            showToast("เกิดข้อผิดพลาด: " + resultData.message, "error");
                        }
                    } catch (error) {
                        showToast("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้: " + error.message, "error");
                    }
                    hideLoading();
                }
            });
        }

        function deleteActivePurchaseOrder(poNumber) {
            if (!currentUser || currentUser.role !== 'ADMIN') {
                showToast("คุณไม่มีสิทธิ์ทำรายการนี้", "error");
                return;
            }

            confirmAction(`คุณต้องการลบรายการสั่งซื้อเลขที่ "${poNumber}" ใช่หรือไม่?\nการดำเนินการนี้จะลบรายการสั่งซื้อออกจากระบบอย่างถาวรและไม่สามารถย้อนกลับได้`, async () => {
                showLoading("กำลังลบรายการสั่งซื้อ...");
                try {
                    const res = await fetch(API_URL, {
                        method: 'POST',
                        body: JSON.stringify({
                            action: 'deletePurchaseOrderActive',
                            payload: {
                                requesterEmail: currentUser.email,
                                poNumber: poNumber
                            }
                        })
                    });
                    const resData = await res.json();
                    hideLoading();
                    
                    if (resData.status === 'success') {
                        showToast("ลบรายการสั่งซื้อสำเร็จ", "success");
                        await fetchData(true); // force refresh database
                        
                        // Re-render views
                        const receiveTableBody = document.getElementById('receiveTableBody');
                        if (receiveTableBody) {
                            renderReceiveTable();
                        }
                        const dashboardOrdersTableBody = document.getElementById('dashboardOrdersTableBody');
                        if (dashboardOrdersTableBody) {
                            renderDashboardOrdersTable();
                        }
                    } else {
                        showToast(resData.message || "เกิดข้อผิดพลาดในการลบรายการสั่งซื้อ", "error");
                    }
                } catch (err) {
                    hideLoading();
                    console.error(err);
                    showToast("เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว", "error");
                }
            });
        }

        function handleDraftOrdersSearch(val) {
            draftOrdersSearchQuery = val.trim().toLowerCase();
            renderDraftOrdersTable();
        }

        function renderDraftOrdersTable() {
            const tableBody = document.getElementById('draftOrdersTableBody');
            if (!tableBody) return;

            const orders = db.purchaseOrders || [];
            let filtered = orders.filter(o => o.status === "เตรียมสั่ง");

            // Sort by poNumber descending (latest drafts first)
            filtered.sort((a, b) => {
                const poA = a.poNumber || '';
                const poB = b.poNumber || '';
                return poB.localeCompare(poA);
            });

            if (draftOrdersSearchQuery) {
                filtered = filtered.filter(o => 
                    o.productId.toLowerCase().includes(draftOrdersSearchQuery) ||
                    o.productName.toLowerCase().includes(draftOrdersSearchQuery)
                );
            }

            if (filtered.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="p-12 text-center text-slate-400">
                            <div class="flex flex-col items-center justify-center">
                                <i class="fa-solid fa-file-circle-plus text-slate-200 text-4xl mb-2"></i>
                                <p class="text-sm font-bold text-slate-500">ไม่มีรายการเตรียมสั่งซื้อ</p>
                                <p class="text-xs text-slate-400 mt-0.5">คลิกที่ปุ่ม "เพิ่มรายการ" เพื่อเริ่มบันทึกอะไหล่ที่ต้องการขอสั่งซื้อ</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            tableBody.innerHTML = '';
            filtered.forEach(o => {
                const prod = db.products.find(p => String(p.id).trim() === String(o.productId).trim());
                const unit = prod ? prod.unit : 'ชิ้น';
                const supplier = o.supplier || (prod ? (prod.supplier || 'ไม่ระบุ') : 'ไม่ระบุ');

                const rowHtml = `
                    <tr class="hover:bg-slate-50/80 transition-colors">
                        <td class="p-4 font-mono text-[11px] text-slate-500">${escapeHTML(o.productId)}</td>
                        <td class="p-4 font-semibold text-slate-800">${escapeHTML(o.productName)}</td>
                        <td class="p-4 text-slate-600">${escapeHTML(supplier)}</td>
                        <td class="p-4 text-center font-bold text-slate-700">${o.orderedQty}</td>
                        <td class="p-4 text-center text-slate-500">${escapeHTML(unit)}</td>
                        <td class="p-4 text-center">
                            <div class="flex items-center justify-center gap-1.5">
                                <button onclick="handleEditOrderDraft('${escapeForJS(o.poNumber)}', '${escapeForJS(o.productId)}')" class="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition" title="แก้ไขจำนวน">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button onclick="handleDeleteOrderDraft('${escapeForJS(o.poNumber)}', '${escapeForJS(o.productId)}')" class="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition" title="ลบรายการ">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', rowHtml);
            });
        }

        let currentSelectedSwalProduct = null;

        window.onSwalProductSearchInput = function(val) {
            const resultsDiv = document.getElementById('swal-prod-results');
            if (!resultsDiv) return;

            const q = val.trim().toLowerCase();
            if (!q) {
                resultsDiv.classList.add('hidden');
                resultsDiv.innerHTML = '';
                return;
            }

            const products = db.products || [];
            const matches = products.filter(p => {
                const isCancelled = p.note && (p.note.trim() === 'ยกเลิกใช้' || p.note.includes('ยกเลิกใช้'));
                if (isCancelled) return false;

                const idStr = String(p.id || '').toLowerCase();
                const nameStr = String(p.name || '').toLowerCase();
                return idStr.includes(q) || nameStr.includes(q);
            }).slice(0, 8);

            if (matches.length === 0) {
                resultsDiv.classList.remove('hidden');
                resultsDiv.innerHTML = `<div class="p-3 text-center text-slate-400 text-xs">ไม่พบอะไหล่ที่ตรงกัน</div>`;
                return;
            }

            resultsDiv.classList.remove('hidden');
            resultsDiv.innerHTML = matches.map(p => `
                <div onclick="selectSwalProduct('${escapeForJS(String(p.id))}')" class="p-2.5 hover:bg-slate-50 cursor-pointer transition text-xs flex flex-col text-left">
                    <div class="font-bold text-slate-700">${escapeHTML(String(p.name))}</div>
                    <div class="text-[10px] text-slate-400 font-mono mt-0.5">${escapeHTML(String(p.id))}</div>
                </div>
            `).join('');
        };

        window.selectSwalProduct = function(productId) {
            const products = db.products || [];
            const prod = products.find(p => String(p.id).trim() === String(productId).trim());
            if (!prod) return;

            currentSelectedSwalProduct = prod;

            const infoDiv = document.getElementById('swal-selected-prod-info');
            if (infoDiv) infoDiv.classList.remove('hidden');

            const infoId = document.getElementById('info-p-id');
            const infoName = document.getElementById('info-p-name');
            const infoUnit = document.getElementById('info-p-unit');
            const infoSupplier = document.getElementById('info-p-supplier');

            if (infoId) infoId.innerText = String(prod.id);
            if (infoName) infoName.innerText = String(prod.name);
            if (infoUnit) infoUnit.innerText = String(prod.unit || 'ชิ้น');
            if (infoSupplier) infoSupplier.innerText = String(prod.supplier || 'ไม่ระบุ');

            const swalOrderUnit = document.getElementById('swal-order-unit');
            if (swalOrderUnit) swalOrderUnit.innerText = String(prod.unit || 'ชิ้น');

            const qtyInput = document.getElementById('swal-order-qty');
            if (qtyInput) qtyInput.placeholder = `ระบุจำนวน${prod.unit || 'ชิ้น'}`;

            const searchInput = document.getElementById('swal-prod-search');
            if (searchInput) searchInput.value = String(prod.name);

            const resultsDiv = document.getElementById('swal-prod-results');
            if (resultsDiv) {
                resultsDiv.classList.add('hidden');
                resultsDiv.innerHTML = '';
            }
        };

        function handleAddOrderDraft() {
            Swal.fire({
                title: '<i class="fa-solid fa-file-circle-plus text-blue-600 mr-2"></i>เพิ่มรายการเตรียมสั่งซื้อ',
                html: `
                    <div class="space-y-3 text-left text-xs">
                        <div>
                            <label class="block font-semibold text-gray-600 mb-1.5 text-xs">ค้นหาอะไหล่</label>
                            <input type="text" id="swal-prod-search" oninput="onSwalProductSearchInput(this.value)" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="พิมพ์รหัส หรือชื่อสินค้าเพื่อค้นหา...">
                            <div id="swal-prod-results" class="border border-slate-200 rounded-xl overflow-hidden mt-1.5 hidden max-h-40 overflow-y-auto bg-white shadow-lg text-left divide-y divide-slate-100 z-50 relative"></div>
                        </div>

                        <div id="swal-selected-prod-info" class="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-3 hidden text-left text-[11px] text-slate-600">
                            <p class="font-bold text-slate-800 mb-1 text-[11px]">อะไหล่ที่เลือก:</p>
                            <div class="space-y-1">
                                <div><span class="text-slate-400">รหัสสินค้า:</span> <span id="info-p-id" class="font-bold font-mono text-slate-700"></span></div>
                                <div><span class="text-slate-400">ชื่อสินค้า:</span> <span id="info-p-name" class="font-bold text-slate-700"></span></div>
                                <div><span class="text-slate-400">ซัพพลายเออร์เดิม:</span> <span id="info-p-supplier" class="font-bold text-amber-700"></span></div>
                            </div>
                        </div>

                        <div>
                            <label class="block font-semibold text-gray-600 mb-1.5 text-xs">จำนวนที่ต้องการสั่งซื้อ (<span id="swal-order-unit">ชิ้น</span>)</label>
                            <input type="number" id="swal-order-qty" min="1" value="1" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="ระบุจำนวนชิ้น">
                        </div>
                    </div>
                `,
                confirmButtonText: '<i class="fa-solid fa-save mr-1.5"></i>บันทึกรายการ',
                confirmButtonColor: '#2563eb',
                showCancelButton: true,
                cancelButtonText: 'ยกเลิก',
                cancelButtonColor: '#6b7280',
                reverseButtons: true,
                focusConfirm: false,
                customClass: {
                    popup: 'rounded-2xl',
                    confirmButton: 'rounded-xl font-semibold !text-xs',
                    cancelButton: 'rounded-xl font-semibold !text-xs',
                },
                didOpen: () => {
                    currentSelectedSwalProduct = null;
                    const swalOrderUnit = document.getElementById('swal-order-unit');
                    if (swalOrderUnit) swalOrderUnit.innerText = 'ชิ้น';
                    const qtyInput = document.getElementById('swal-order-qty');
                    if (qtyInput) qtyInput.placeholder = 'ระบุจำนวนชิ้น';
                },
                preConfirm: () => {
                    if (!currentSelectedSwalProduct) {
                        Swal.showValidationMessage('กรุณาค้นหาและเลือกอะไหล่ก่อน');
                        return false;
                    }
                    const qtyInput = document.getElementById('swal-order-qty');
                    const qtyVal = parseFloat(qtyInput.value);
                    if (isNaN(qtyVal) || qtyVal <= 0) {
                        Swal.showValidationMessage('กรุณากรอกจำนวนที่ถูกต้อง (มากกว่า 0)');
                        return false;
                    }
                    return {
                        productId: currentSelectedSwalProduct.id,
                        productName: currentSelectedSwalProduct.name,
                        orderedQty: qtyVal
                    };
                }
            }).then(async (result) => {
                if (result.isConfirmed && result.value) {
                    const data = result.value;
                    showLoading("กำลังเพิ่มรายการเตรียมสั่งซื้อ...");
                    try {
                        const res = await fetch(API_URL, {
                            method: 'POST',
                            body: JSON.stringify({ action: 'addPurchaseOrderDraft', payload: data })
                        });
                        const resData = await res.json();
                        if (resData.status === 'success') {
                            showToast("เพิ่มรายการเตรียมสั่งซื้อสำเร็จ!", "success");
                            await fetchData(true);
                            renderDraftOrdersTable();
                        } else {
                            showToast("เกิดข้อผิดพลาด: " + resData.message, "error");
                        }
                    } catch (error) {
                        showToast("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้: " + error.message, "error");
                    }
                    hideLoading();
                }
            });
        }

        function handleEditOrderDraft(poNumber, productId) {
            const orders = db.purchaseOrders || [];
            const order = orders.find(o => poNumber ? o.poNumber === poNumber : (o.productId === productId && o.status === "เตรียมสั่ง"));
            if (!order) return;

            const prod = db.products ? db.products.find(p => String(p.id).trim() === String(order.productId).trim()) : null;
            const unit = prod ? (prod.unit || 'ชิ้น') : 'ชิ้น';

            Swal.fire({
                title: '<i class="fa-solid fa-pen-to-square text-blue-600 mr-2"></i>แก้ไขจำนวนสั่งซื้อ',
                html: `
                    <div class="text-left text-xs space-y-2">
                        <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                            <p class="font-bold text-slate-800">${escapeHTML(order.productName)}</p>
                            <p class="text-[10px] text-slate-400 font-mono mt-0.5">รหัสสินค้า: ${escapeHTML(order.productId)}</p>
                        </div>
                        <div>
                            <label class="block font-semibold text-gray-600 mb-1.5">จำนวนที่สั่งใหม่ (${escapeHTML(unit)})</label>
                            <input type="number" id="swal-edit-qty" min="1" value="${order.orderedQty}" class="swal2-input !mx-0 !w-full !text-xs !h-9">
                        </div>
                    </div>
                `,
                confirmButtonText: '<i class="fa-solid fa-save mr-1.5"></i>บันทึกแก้ไข',
                confirmButtonColor: '#2563eb',
                showCancelButton: true,
                cancelButtonText: 'ยกเลิก',
                cancelButtonColor: '#6b7280',
                reverseButtons: true,
                customClass: {
                    popup: 'rounded-2xl',
                    confirmButton: 'rounded-xl font-semibold !text-xs',
                    cancelButton: 'rounded-xl font-semibold !text-xs',
                },
                preConfirm: () => {
                    const qtyInput = document.getElementById('swal-edit-qty');
                    const qtyVal = parseFloat(qtyInput.value);
                    if (isNaN(qtyVal) || qtyVal <= 0) {
                        Swal.showValidationMessage('กรุณากรอกจำนวนที่ถูกต้อง');
                        return false;
                    }
                    return qtyVal;
                }
            }).then(async (result) => {
                if (result.isConfirmed && result.value) {
                    const qtyVal = result.value;
                    showLoading("กำลังแก้ไขรายการ...");
                    try {
                        const res = await fetch(API_URL, {
                            method: 'POST',
                            body: JSON.stringify({ action: 'editPurchaseOrderDraft', payload: { poNumber: poNumber, productId: productId, orderedQty: qtyVal } })
                        });
                        const resData = await res.json();
                        if (resData.status === 'success') {
                            showToast("แก้ไขจำนวนสั่งซื้อสำเร็จ", "success");
                            await fetchData(true);
                            renderDraftOrdersTable();
                        } else {
                            showToast("เกิดข้อผิดพลาด: " + resData.message, "error");
                        }
                    } catch (error) {
                        showToast("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้", "error");
                    }
                    hideLoading();
                }
            });
        }

        function handleDeleteOrderDraft(poNumber, productId) {
            Swal.fire({
                title: 'ยืนยันการลบรายการ?',
                text: "คุณแน่ใจว่าต้องการลบรายการเตรียมสั่งซื้อนี้ออกจากฐานข้อมูล?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'ยืนยันการลบ',
                cancelButtonText: 'ยกเลิก',
                reverseButtons: true,
                customClass: {
                    popup: 'rounded-2xl',
                    confirmButton: 'rounded-xl font-semibold !text-xs',
                    cancelButton: 'rounded-xl font-semibold !text-xs',
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    showLoading("กำลังลบรายการ...");
                    try {
                        const res = await fetch(API_URL, {
                            method: 'POST',
                            body: JSON.stringify({ action: 'deletePurchaseOrderDraft', payload: { poNumber: poNumber, productId: productId } })
                        });
                        const resData = await res.json();
                        if (resData.status === 'success') {
                            showToast("ลบรายการสำเร็จ", "success");
                            await fetchData(true);
                            renderDraftOrdersTable();
                            renderManageOrdersTable();
                        } else {
                            showToast("เกิดข้อผิดพลาด: " + resData.message, "error");
                        }
                    } catch (error) {
                        showToast("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้", "error");
                    }
                    hideLoading();
                }
            });
        }

        function exportDraftOrdersToExcel() {
            const orders = db.purchaseOrders || [];
            const draftOrders = orders.filter(o => o.status === "เตรียมสั่ง");
            if (draftOrders.length === 0) {
                showToast("ไม่มีรายการเตรียมสั่งสำหรับการส่งออก", "warning");
                return;
            }

            const data = draftOrders.map(o => {
                const prod = db.products.find(p => String(p.id).trim() === String(o.productId).trim());
                const unit = prod ? prod.unit : 'ชิ้น';
                const supplier = o.supplier || (prod ? (prod.supplier || 'ไม่ระบุ') : 'ไม่ระบุ');

                return {
                    "รหัสสินค้า": String(o.productId),
                    "ชื่อสินค้า": o.productName || '',
                    "จำนวนที่สั่ง": parseFloat(o.orderedQty) || 0,
                    "หน่วย": unit,
                    "Supplier": supplier
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "เตรียมสั่งซื้อ");

            const max_width = data.reduce((w, r) => Math.max(w, r["ชื่อสินค้า"].length), 10);
            worksheet["!cols"] = [
                { wch: 15 }, // รหัสสินค้า
                { wch: Math.min(max_width + 4, 50) }, // ชื่อสินค้า
                { wch: 15 }, // จำนวนที่สั่ง
                { wch: 10 }, // หน่วย
                { wch: 20 }  // Supplier
            ];

            // Format numbers
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            for (let R = range.s.r + 1; R <= range.e.r; ++R) {
                const qty_cell = XLSX.utils.encode_cell({c: 2, r: R}); // Column C is orderedQty (0-indexed: 2)
                if (worksheet[qty_cell]) {
                    worksheet[qty_cell].t = 'n';
                    worksheet[qty_cell].z = '#,##0';
                }
            }

            const today = new Date();
            const dateStr = today.getFullYear() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');
            
            XLSX.writeFile(workbook, `Draft_Purchase_Orders_${dateStr}.xlsx`);
            showToast("ส่งออกข้อมูลสำเร็จ", "success");
        }

        function handleManageOrdersSearch(val) {
            manageOrdersSearchQuery = val.trim().toLowerCase();
            renderManageOrdersTable();
        }

        function handleManageOrdersSupplierFilter(val) {
            manageOrdersSupplierFilter = val.trim();
            renderManageOrdersTable();
        }

        function renderManageOrdersTable() {
            const tableBody = document.getElementById('manageOrdersTableBody');
            if (!tableBody) return;

            const orders = db.purchaseOrders || [];
            
            // Filter: only status "เตรียมสั่ง" and "รออนุมัติ"
            let filtered = orders.filter(o => o.status === "เตรียมสั่ง" || o.status === "รออนุมัติ");

            // Filter by Supplier dropdown
            if (manageOrdersSupplierFilter) {
                filtered = filtered.filter(o => {
                    const prod = db.products.find(p => String(p.id).trim() === String(o.productId).trim());
                    const supplier = o.supplier || (prod ? (prod.supplier || 'ไม่ระบุ') : 'ไม่ระบุ');
                    return supplier === manageOrdersSupplierFilter;
                });
            }

            // Filter by search query (PO Number, PR Number, รหัสสินค้า, ชื่อสินค้า)
            if (manageOrdersSearchQuery) {
                filtered = filtered.filter(o => 
                    (o.poNumber || '').toLowerCase().includes(manageOrdersSearchQuery) ||
                    (o.prNumber || '').toLowerCase().includes(manageOrdersSearchQuery) ||
                    (o.productId || '').toLowerCase().includes(manageOrdersSearchQuery) ||
                    (o.productName || '').toLowerCase().includes(manageOrdersSearchQuery)
                );
            }

            if (filtered.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="10" class="p-12 text-center text-slate-400">
                            <div class="flex flex-col items-center justify-center">
                                <i class="fa-solid fa-tasks text-slate-200 text-4xl mb-2"></i>
                                <p class="text-sm font-bold text-slate-500">ไม่มีใบสั่งซื้อที่รอการอนุมัติหรือเตรียมสั่ง</p>
                                <p class="text-xs text-slate-400 mt-0.5">รายการจัดซื้อทั้งหมดได้รับการดำเนินงานเรียบร้อยแล้ว</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            // Grouping logic:
            // 1. Unprocessed items: status === "เตรียมสั่ง"
            const unprocessed = filtered.filter(o => o.status === "เตรียมสั่ง");
            // 2. Processed items: status === "รออนุมัติ"
            const processed = filtered.filter(o => o.status === "รออนุมัติ");

            // Sort both groups by date/poNumber descending (latest first)
            unprocessed.sort((a, b) => {
                const poA = a.poNumber || '';
                const poB = b.poNumber || '';
                return poB.localeCompare(poA);
            });

            processed.sort((a, b) => {
                const dateA = a.orderDate || '';
                const dateB = b.orderDate || '';
                if (dateA !== dateB) return dateB.localeCompare(dateA);
                const poA = a.poNumber || '';
                const poB = b.poNumber || '';
                return poB.localeCompare(poA);
            });

            tableBody.innerHTML = '';

            // Render Section 1: Unprocessed items (Ungrouped Flat List)
            if (unprocessed.length > 0) {
                // Section Header Row
                const headerRow = `
                    <tr class="bg-blue-50/50 text-blue-800 font-bold border-y border-blue-100">
                        <td colspan="10" class="px-4 py-2 text-xs">
                            <div class="flex items-center gap-1.5">
                                <i class="fa-solid fa-folder-open text-blue-500"></i>
                                รายการใหม่ (ยังไม่ได้ดำเนินการจัดกลุ่ม)
                            </div>
                        </td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', headerRow);

                unprocessed.forEach(o => {
                    renderRow(o);
                });
            }

            // Render Section 2: Grouped by Supplier
            if (processed.length > 0) {
                // Group processed items by supplier
                const groupedBySupplier = {};
                processed.forEach(o => {
                    const prod = db.products.find(p => String(p.id).trim() === String(o.productId).trim());
                    const supplier = o.supplier || (prod ? (prod.supplier || 'ไม่ระบุ') : 'ไม่ระบุ');
                    if (!groupedBySupplier[supplier]) {
                        groupedBySupplier[supplier] = [];
                    }
                    groupedBySupplier[supplier].push(o);
                });

                // Section Header Row
                const headerRow = `
                    <tr class="bg-slate-100 text-slate-700 font-bold border-y border-slate-200">
                        <td colspan="10" class="px-4 py-2 text-xs">
                            <div class="flex items-center gap-1.5">
                                <i class="fa-solid fa-boxes-packing text-slate-500"></i>
                                รายการสั่งซื้อแยกตามซัพพลายเออร์ (จัดกลุ่ม)
                            </div>
                        </td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', headerRow);

                // Render each supplier group
                Object.keys(groupedBySupplier).sort().forEach(supplier => {
                    const supplierHeaderRow = `
                        <tr class="bg-amber-50/40 text-amber-800 font-bold border-b border-amber-100">
                            <td colspan="10" class="px-6 py-1.5 text-[10px] uppercase tracking-wider">
                                <i class="fa-solid fa-truck-field mr-1.5"></i> Supplier: ${escapeHTML(supplier)}
                            </td>
                        </tr>
                    `;
                    tableBody.insertAdjacentHTML('beforeend', supplierHeaderRow);

                    groupedBySupplier[supplier].forEach(o => {
                        renderRow(o);
                    });
                });
            }

            // Helper to render a single row
            function renderRow(o) {
                const dateStr = o.orderDate || '-';
                const displayPo = o.poNumber.indexOf("PO-DRF-") === 0 ? `<span class="text-slate-400 italic">ดราฟต์</span>` : escapeHTML(o.poNumber);
                const displayPr = o.prNumber === "PR-DRAFT" ? `<span class="text-slate-400 italic">ดราฟต์</span>` : escapeHTML(o.prNumber);

                // Determine unit cost and total cost. Fall back to db.products cost if 0
                let cost = parseFloat(o.unitCost) || 0;
                if (cost === 0) {
                    const prod = db.products.find(p => String(p.id).trim() === String(o.productId).trim());
                    cost = prod ? (parseFloat(prod.cost) || 0) : 0;
                }
                const total = o.orderedQty * cost;
                
                const prod = db.products.find(p => String(p.id).trim() === String(o.productId).trim());
                const supplier = o.supplier || (prod ? (prod.supplier || 'ไม่ระบุ') : 'ไม่ระบุ');

                const rowHtml = `
                    <tr class="hover:bg-slate-50/80 transition-colors">
                        <td class="p-4 text-slate-500">${escapeHTML(dateStr)}</td>
                        <td class="p-4 font-semibold text-slate-700">${displayPo}</td>
                        <td class="p-4 font-mono text-[11px] text-slate-500">${displayPr}</td>
                        <td class="p-4 font-mono text-[11px] text-slate-500">${escapeHTML(o.productId)}</td>
                        <td class="p-4 font-semibold text-slate-800">${escapeHTML(o.productName)}</td>
                        <td class="p-4 text-slate-600">${escapeHTML(supplier)}</td>
                        <td class="p-4 text-center font-bold text-slate-700">${o.orderedQty}</td>
                        <td class="p-4 text-right text-slate-600 font-mono">฿${cost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td class="p-4 text-right text-slate-800 font-bold font-mono">฿${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td class="p-4 text-center">
                            <div class="flex items-center justify-center gap-1.5">
                                <button onclick="handleUpdateOrderDraft('${escapeForJS(o.poNumber)}', '${escapeForJS(o.productId)}')" class="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 font-bold rounded-lg text-[10px] transition border border-amber-200 shadow-sm active:scale-95">
                                    <i class="fa-solid fa-pen-to-square"></i> อัพเดท
                                </button>
                                <button onclick="handleDeleteOrderDraft('${escapeForJS(o.poNumber)}', '${escapeForJS(o.productId)}')" class="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 font-bold rounded-lg text-[10px] transition border border-rose-200 shadow-sm active:scale-95" title="ลบรายการ">
                                    <i class="fa-solid fa-trash-can"></i> ลบ
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', rowHtml);
            }
        }

        window.recalculateSwalTotalCost = function() {
            const qtyInput = document.getElementById('swal-update-qty');
            const costInput = document.getElementById('swal-update-cost');
            const totalSpan = document.getElementById('swal-update-total');
            if (!qtyInput || !costInput || !totalSpan) return;

            const qty = parseFloat(qtyInput.value) || 0;
            const cost = parseFloat(costInput.value) || 0;
            const total = qty * cost;
            totalSpan.innerText = '฿' + total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
        };

        function handleUpdateOrderDraft(poNumber, productId) {
            const orders = db.purchaseOrders || [];
            const order = orders.find(o => poNumber ? o.poNumber === poNumber : (o.productId === productId && o.status === "เตรียมสั่ง"));
            if (!order) return;

            const prod = db.products.find(p => String(p.id).trim() === String(order.productId).trim());
            const currentSupplier = order.supplier || (prod ? (prod.supplier || '') : '');
            const currentUnit = prod ? (prod.unit || 'ชิ้น') : 'ชิ้น';

            let initialCost = parseFloat(order.unitCost) || 0;
            if (initialCost === 0 && prod) {
                initialCost = parseFloat(prod.cost) || 0;
            }

            const initialPo = order.poNumber.indexOf("PO-DRF-") === 0 ? '' : order.poNumber;
            const initialPr = order.prNumber === "PR-DRAFT" ? '' : order.prNumber;

            Swal.fire({
                title: '<i class="fa-solid fa-tasks text-amber-600 mr-2"></i>อัปเดตใบสั่งซื้อ',
                html: `
                    <div class="space-y-4 text-left text-xs">
                        <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                            <div class="col-span-2">
                                <span class="text-slate-400 block mb-0.5">ชื่อสินค้า:</span>
                                <span class="font-bold text-slate-800 text-xs">${escapeHTML(order.productName)}</span>
                            </div>
                            <div>
                                <span class="text-slate-400 block mb-0.5">รหัสสินค้า:</span>
                                <span class="font-bold font-mono text-slate-800">${escapeHTML(order.productId)}</span>
                            </div>
                            <div>
                                <span class="text-slate-400 block mb-0.5">ราคารวม (คำนวน):</span>
                                <span id="swal-update-total" class="font-extrabold text-blue-600 text-xs">฿0.00</span>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-600 mb-1">จำนวนที่สั่ง</label>
                                <input type="number" id="swal-update-qty" min="1" value="${order.orderedQty}" oninput="recalculateSwalTotalCost()" class="swal2-input !mx-0 !w-full !text-xs !h-9">
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-600 mb-1">ราคาต่อหน่วย (บาท)</label>
                                <input type="number" id="swal-update-cost" min="0" step="0.01" value="${initialCost}" oninput="recalculateSwalTotalCost()" class="swal2-input !mx-0 !w-full !text-xs !h-9">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-600 mb-1">หน่วยนับ</label>
                                <input type="text" id="swal-update-unit" value="${escapeHTML(currentUnit)}" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="ระบุหน่วยนับ (เช่น ชิ้น, กล่อง)">
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-600 mb-1">สถานะ</label>
                                <select id="swal-update-status" class="swal2-select !mx-0 !w-full !text-xs !h-9 !border-slate-200 !rounded-xl !px-3 focus:!border-blue-500">
                                    <option value="เตรียมสั่ง" ${order.status === 'เตรียมสั่ง' ? 'selected' : ''}>เตรียมสั่ง</option>
                                    <option value="รออนุมัติ" ${order.status === 'รออนุมัติ' ? 'selected' : ''}>รออนุมัติ</option>
                                    <option value="สั่งแล้ว" ${order.status === 'สั่งแล้ว' ? 'selected' : ''}>สั่งแล้ว (นำออกจากหน้านี้)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="block font-semibold text-slate-600 mb-1">Supplier</label>
                            <input type="text" id="swal-update-supplier" value="${escapeHTML(currentSupplier)}" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="ระบุซัพพลายเออร์">
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-600 mb-1">PR Number (เลขที่ขอซื้อ)</label>
                                <input type="text" id="swal-update-pr" value="${escapeHTML(initialPr)}" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="ระบุ PR (เว้นว่างไว้เพื่อเป็นดราฟต์)">
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-600 mb-1">PO Number (เลขที่ใบสั่งซื้อ)</label>
                                <input type="text" id="swal-update-po" value="${escapeHTML(initialPo)}" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="ระบุ PO (เว้นว่างไว้เพื่อเป็นดราฟต์)">
                            </div>
                        </div>
                    </div>
                `,
                confirmButtonText: '<i class="fa-solid fa-save mr-1.5"></i>บันทึกการอัปเดต',
                confirmButtonColor: '#d97706',
                showCancelButton: true,
                cancelButtonText: 'ยกเลิก',
                cancelButtonColor: '#6b7280',
                reverseButtons: true,
                focusConfirm: false,
                customClass: {
                    popup: 'rounded-2xl w-full max-w-lg',
                    confirmButton: 'rounded-xl font-semibold !text-xs',
                    cancelButton: 'rounded-xl font-semibold !text-xs',
                },
                didOpen: () => {
                    recalculateSwalTotalCost();
                },
                preConfirm: () => {
                    const qtyInput = document.getElementById('swal-update-qty');
                    const costInput = document.getElementById('swal-update-cost');
                    const supplierInput = document.getElementById('swal-update-supplier');
                    const statusSelect = document.getElementById('swal-update-status');
                    const poInput = document.getElementById('swal-update-po');
                    const prInput = document.getElementById('swal-update-pr');
                    const unitInput = document.getElementById('swal-update-unit');

                    const qtyVal = parseFloat(qtyInput.value);
                    const costVal = parseFloat(costInput.value) || 0;
                    const statusVal = statusSelect.value;
                    const poVal = poInput.value.trim();
                    const prVal = prInput.value.trim();
                    const unitVal = unitInput.value.trim() || 'ชิ้น';

                    if (isNaN(qtyVal) || qtyVal <= 0) {
                        Swal.showValidationMessage('กรุณากรอกจำนวนที่สั่งซื้อให้ถูกต้อง');
                        return false;
                    }
                    if (costVal < 0) {
                        Swal.showValidationMessage('กรุณากรอกราคาต่อหน่วยให้ถูกต้อง');
                        return false;
                    }
                    if (statusVal === 'สั่งแล้ว') {
                        if (!poVal || !prVal) {
                            Swal.showValidationMessage('กรุณากรอกเลขที่ PO Number และ PR Number ให้ครบทั้งสองช่องเพื่อเปลี่ยนสถานะเป็น "สั่งแล้ว"');
                            return false;
                        }
                    }

                    return {
                        originalPoNumber: order.poNumber,
                        newPoNumber: poVal,
                        newPrNumber: prVal,
                        orderedQty: qtyVal,
                        unitCost: costVal,
                        status: statusVal,
                        productId: order.productId,
                        newSupplier: supplierInput.value.trim(),
                        newUnit: unitVal
                    };
                }
            }).then(async (result) => {
                if (result.isConfirmed && result.value) {
                    const data = result.value;
                    
                    if (data.status === 'สั่งแล้ว') {
                        const confirmResult = await Swal.fire({
                            title: 'ยืนยันการเปลี่ยนสถานะ?',
                            text: 'หากเปลี่ยนสถานะเป็น "สั่งแล้ว" รายการนี้จะถูกย้ายออกจากหน้าจัดการคำสั่งซื้อไปยังหน้าตรวจรับสินค้าทันที',
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#2563eb',
                            cancelButtonColor: '#6b7280',
                            confirmButtonText: 'ยืนยันเปลี่ยนเป็นสั่งแล้ว',
                            cancelButtonText: 'ยกเลิก',
                            reverseButtons: true,
                            customClass: {
                                popup: 'rounded-2xl',
                                confirmButton: 'rounded-xl font-semibold !text-xs',
                                cancelButton: 'rounded-xl font-semibold !text-xs',
                            }
                        });
                        
                        if (!confirmResult.isConfirmed) {
                            return;
                        }
                    }
                    
                    showLoading("กำลังอัปเดตใบสั่งซื้อ...");
                    try {
                        const res = await fetch(API_URL, {
                            method: 'POST',
                            body: JSON.stringify({ action: 'updatePurchaseOrderDraft', payload: data })
                        });
                        const resData = await res.json();
                        if (resData.status === 'success') {
                            showToast("อัปเดตใบสั่งซื้อสำเร็จ!", "success");
                            await fetchData(true);
                            renderManageOrdersTable();
                        } else {
                            showToast("เกิดข้อผิดพลาด: " + resData.message, "error");
                        }
                    } catch (error) {
                        showToast("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้: " + error.message, "error");
                    }
                    hideLoading();
                }
            });
        }

        function handleHistorySearch(val) {
            purchaseHistorySearchQuery = val.trim().toLowerCase();
            renderPurchaseHistoryCards();
        }

        function handleHistoryCategoryFilter(val) {
            purchaseHistoryCategoryFilter = val.trim();
            renderPurchaseHistoryCards();
        }

        function handleHistoryGroupFilter(val) {
            purchaseHistoryGroupFilter = val.trim();
            renderPurchaseHistoryCards();
        }

        function renderPurchaseHistoryCards() {
            const container = document.getElementById('purchaseHistoryCardsContainer');
            if (!container) return;

            const orders = db.purchaseOrders || [];
            const products = db.products || [];
            const isAdmin = currentUser && currentUser.role === 'ADMIN';

            // Filter orders: only ordered items (exclude drafts, wait-for-approvals)
            let processedOrders = orders.filter(o => o.status === "สั่งแล้ว" || o.status === "ได้รับครบ" || o.status === "ค้างส่ง");

            // Filter by search query (PO, PR, Product ID, Product Name)
            if (purchaseHistorySearchQuery) {
                processedOrders = processedOrders.filter(o => 
                    (o.poNumber || '').toLowerCase().includes(purchaseHistorySearchQuery) ||
                    (o.prNumber || '').toLowerCase().includes(purchaseHistorySearchQuery) ||
                    (o.productId || '').toLowerCase().includes(purchaseHistorySearchQuery) ||
                    (o.productName || '').toLowerCase().includes(purchaseHistorySearchQuery)
                );
            }

            // Group processed orders by productId
            const grouped = {};
            processedOrders.forEach(o => {
                if (!grouped[o.productId]) {
                    grouped[o.productId] = [];
                }
                grouped[o.productId].push(o);
            });

            // Map products matching filters
            let cardData = [];
            Object.keys(grouped).forEach(prodId => {
                const prod = products.find(p => String(p.id).trim() === String(prodId).trim());
                if (!prod) return;

                // Category filter
                if (purchaseHistoryCategoryFilter && prod.category !== purchaseHistoryCategoryFilter) return;

                // Group filter
                if (purchaseHistoryGroupFilter && prod.group !== purchaseHistoryGroupFilter) return;

                // Calculate stats
                const itemOrders = grouped[prodId];
                const orderCount = itemOrders.length;
                let totalVal = 0;
                let latestDate = '';
                itemOrders.forEach(o => {
                    let cost = parseFloat(o.unitCost) || 0;
                    if (cost === 0) {
                        cost = parseFloat(prod.cost) || 0;
                    }
                    totalVal += (o.orderedQty * cost);

                    const d = o.orderDate || '';
                    if (d > latestDate) latestDate = d;
                });

                cardData.push({
                    productId: prodId,
                    productName: prod.name,
                    unit: prod.unit || 'ชิ้น',
                    orderCount: orderCount,
                    totalVal: totalVal,
                    orders: itemOrders,
                    latestDate: latestDate
                });
            });

            // Sort cards by the latest order date descending
            cardData.sort((a, b) => b.latestDate.localeCompare(a.latestDate));

            if (cardData.length === 0) {
                container.innerHTML = `
                    <div class="border border-slate-150 rounded-2xl p-8 bg-slate-50/50 flex flex-col items-center justify-center text-center py-12">
                        <i class="fa-solid fa-clock-rotate-left text-slate-300 text-4xl mb-3"></i>
                        <p class="text-sm font-bold text-slate-600">ไม่พบประวัติการสั่งซื้อ</p>
                        <p class="text-xs text-slate-400 mt-1">ไม่มีข้อมูลประวัติใบสั่งซื้อที่ตรงกับเงื่อนไขการค้นหา</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = '';
            cardData.forEach((card, index) => {
                const cardId = `history-card-${index}`;
                const detailId = `history-detail-${index}`;
                const arrowId = `history-arrow-${index}`;

                // Sort orders in-place by date/PO descending (latest first)
                card.orders.sort((a, b) => {
                    const dateA = a.orderDate || '';
                    const dateB = b.orderDate || '';
                    if (dateA !== dateB) return dateB.localeCompare(dateA);
                    const poA = a.poNumber || '';
                    const poB = b.poNumber || '';
                    return poB.localeCompare(poA);
                });

                // Construct orders rows HTML
                let ordersHtml = card.orders.map(o => {
                    const dateStr = o.orderDate || '-';
                    const prod = products.find(p => String(p.id).trim() === String(o.productId).trim());
                    let cost = parseFloat(o.unitCost) || 0;
                    if (cost === 0 && prod) {
                        cost = parseFloat(prod.cost) || 0;
                    }
                    const total = o.orderedQty * cost;
                    const supplier = prod ? (prod.supplier || 'ไม่ระบุ') : 'ไม่ระบุ';

                    return `
                        <tr class="hover:bg-slate-50/50 transition-colors">
                            <td class="p-3 text-slate-500">${escapeHTML(dateStr)}</td>
                            <td class="p-3 font-semibold text-slate-700">${escapeHTML(o.poNumber)}</td>
                            <td class="p-3 font-mono text-[11px] text-slate-500">${escapeHTML(o.prNumber)}</td>
                            <td class="p-3 text-slate-600">${escapeHTML(supplier)}</td>
                            <td class="p-3 text-center font-bold text-slate-700">${o.orderedQty}</td>
                            <td class="p-3 text-right text-slate-600 font-mono">฿${cost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td class="p-3 text-right text-slate-800 font-bold font-mono">฿${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            ${isAdmin ? `
                            <td class="p-3 text-center">
                                <button onclick="deleteSingleHistoryRecord('${escapeForJS(o.poNumber)}', '${escapeForJS(o.productId)}')" class="inline-flex items-center justify-center w-7 h-7 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-lg transition active:scale-95 border border-rose-100 hover:border-rose-600 shadow-sm" title="ลบรายการนี้">
                                    <i class="fa-solid fa-trash-can text-xs"></i>
                                </button>
                            </td>
                            ` : ''}
                        </tr>
                    `;
                }).join('');

                const cardHtml = `
                    <div class="bg-white border border-slate-150 rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden">
                        <!-- Card Header (Clickable) -->
                        <div onclick="toggleHistoryCardDetail('${detailId}', '${arrowId}')" class="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition duration-150 select-none">
                            <div class="flex items-start gap-4">
                                <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                                    <i class="fa-solid fa-boxes-packing text-base"></i>
                                </div>
                                <div class="text-left">
                                    <span class="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-600 font-bold rounded-lg text-[10px] font-mono mb-1">${escapeHTML(card.productId)}</span>
                                    <h4 class="text-sm font-bold text-slate-800 leading-tight">${escapeHTML(card.productName)}</h4>
                                </div>
                            </div>
                            
                            <div class="flex items-center gap-6">
                                <!-- Stats -->
                                <div class="text-right hidden sm:block">
                                    <span class="text-[10px] text-slate-400 block font-semibold uppercase">สั่งซื้อแล้ว</span>
                                    <span class="font-bold text-slate-800 text-sm">${card.orderCount} ครั้ง</span>
                                </div>
                                <div class="text-right">
                                    <span class="text-[10px] text-slate-400 block font-semibold uppercase">มูลค่ารวมสะสม</span>
                                    <span class="font-extrabold text-blue-600 text-sm">฿${card.totalVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                </div>
                                <button class="text-slate-400 hover:text-slate-600 transition">
                                    <i id="${arrowId}" class="fa-solid fa-chevron-down transform transition-transform duration-200"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Card Expandable Detail Section -->
                        <div id="${detailId}" class="hidden border-t border-slate-150 bg-slate-50/40 transition-all duration-300">
                            <div class="p-4 overflow-x-auto w-full table-scroll">
                                <table class="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr class="border-b border-slate-200 text-slate-500 font-bold bg-slate-100/50">
                                            <th class="p-3">วันที่สั่ง</th>
                                            <th class="p-3">PO Number</th>
                                            <th class="p-3">PR Number</th>
                                            <th class="p-3">Supplier</th>
                                            <th class="p-3 text-center">จำนวน</th>
                                            <th class="p-3 text-right">ราคา/หน่วย</th>
                                            <th class="p-3 text-right">ราคารวม</th>
                                            ${isAdmin ? `<th class="p-3 text-center" style="width: 80px;">จัดการ</th>` : ''}
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100 bg-white">
                                        ${ordersHtml}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', cardHtml);
            });
        }

        window.toggleHistoryCardDetail = function(detailId, arrowId) {
            const detailEl = document.getElementById(detailId);
            const arrowEl = document.getElementById(arrowId);
            if (!detailEl || !arrowEl) return;

            if (detailEl.classList.contains('hidden')) {
                detailEl.classList.remove('hidden');
                arrowEl.classList.add('rotate-180');
            } else {
                detailEl.classList.add('hidden');
                arrowEl.classList.remove('rotate-180');
            }
        };

        window.deleteSingleHistoryRecord = async function(poNumber, productId) {
            const confirmResult = await Swal.fire({
                title: 'ยืนยันการลบประวัติรายการนี้?',
                text: `คุณกำลังจะลบรายการสั่งซื้อเลขที่ PO: ${poNumber} ออกจากประวัติจัดซื้ออย่างถาวร การดำเนินการนี้ไม่สามารถย้อนกลับได้`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'ใช่, ลบเลย!',
                cancelButtonText: 'ยกเลิก',
                reverseButtons: true,
                customClass: {
                    popup: 'rounded-2xl',
                    confirmButton: 'rounded-xl font-semibold !text-xs',
                    cancelButton: 'rounded-xl font-semibold !text-xs',
                }
            });
            
            if (!confirmResult.isConfirmed) return;
            
            showLoading("กำลังลบรายการประวัติ...");
            try {
                const snapshot = await firebase.database().ref('appData/purchaseOrders').get();
                let purchaseOrders = ensureArray(snapshot.val());
                
                purchaseOrders = purchaseOrders.filter(o => !(String(o.poNumber).trim() === String(poNumber).trim() && String(o.productId).trim() === String(productId).trim()));
                
                await firebase.database().ref('appData/purchaseOrders').set(purchaseOrders);
                db.purchaseOrders = purchaseOrders;
                invalidateLocalCache();
                
                showToast("ลบประวัติรายการสำเร็จ", "success");
                renderPurchaseHistoryCards();
            } catch (error) {
                showToast("เกิดข้อผิดพลาด: " + error.message, "error");
            }
            hideLoading();
        };

        window.deleteAllPurchaseHistory = async function() {
            const confirmResult = await Swal.fire({
                title: 'ต้องการลบประวัติทั้งหมดจริงหรือ?',
                text: 'ข้อมูลใบสั่งซื้อที่มีสถานะ "สั่งแล้ว", "ได้รับครบ", และ "ค้างส่ง" ทั้งหมดจะถูกลบออกจากระบบอย่างถาวร การดำเนินการนี้จะไม่ลบรายการที่เป็น "ดราฟต์" หรือ "รออนุมัติ"',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'ยืนยันลบทั้งหมด',
                cancelButtonText: 'ยกเลิก',
                reverseButtons: true,
                customClass: {
                    popup: 'rounded-2xl',
                    confirmButton: 'rounded-xl font-semibold !text-xs',
                    cancelButton: 'rounded-xl font-semibold !text-xs',
                }
            });
            
            if (!confirmResult.isConfirmed) return;

            const finalConfirm = await Swal.fire({
                title: 'กรุณายืนยันอีกครั้ง',
                text: 'ป้อนคำว่า "DELETE ALL" เพื่อยืนยันการลบประวัติจัดซื้อทั้งหมดอย่างถาวร',
                input: 'text',
                inputPlaceholder: 'DELETE ALL',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'ลบข้อมูลประวัติทั้งหมด',
                cancelButtonText: 'ยกเลิก',
                reverseButtons: true,
                customClass: {
                    popup: 'rounded-2xl',
                    confirmButton: 'rounded-xl font-semibold !text-xs',
                    cancelButton: 'rounded-xl font-semibold !text-xs',
                },
                preConfirm: (value) => {
                    if (value !== 'DELETE ALL') {
                        Swal.showValidationMessage('กรุณาป้อนคำยืนยันให้ถูกต้อง');
                        return false;
                    }
                    return true;
                }
            });

            if (!finalConfirm.isConfirmed) return;
            
            showLoading("กำลังลบประวัติจัดซื้อทั้งหมด...");
            try {
                const snapshot = await firebase.database().ref('appData/purchaseOrders').get();
                let purchaseOrders = ensureArray(snapshot.val());
                
                // Keep only orders that are NOT in history statuses
                purchaseOrders = purchaseOrders.filter(o => o.status !== "สั่งแล้ว" && o.status !== "ได้รับครบ" && o.status !== "ค้างส่ง");
                
                await firebase.database().ref('appData/purchaseOrders').set(purchaseOrders);
                db.purchaseOrders = purchaseOrders;
                invalidateLocalCache();
                
                showToast("ลบประวัติจัดซื้อทั้งหมดสำเร็จ", "success");
                renderPurchaseHistoryCards();
            } catch (error) {
                showToast("เกิดข้อผิดพลาด: " + error.message, "error");
            }
            hideLoading();
        };

        let purchaseOverviewProducts = [];
        let purchaseOverviewSuppliers = [];

        window.toggleOverviewMonth = function(monthVal, btn) {
            const idx = purchaseOverviewSelectedMonths.indexOf(monthVal);
            if (idx === -1) {
                purchaseOverviewSelectedMonths.push(monthVal);
                btn.className = "px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-blue-500 bg-blue-600 text-white transition active:scale-95 shadow-sm";
            } else {
                purchaseOverviewSelectedMonths.splice(idx, 1);
                btn.className = "px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition active:scale-95 shadow-sm";
            }
            renderPurchaseOverviewDashboard();
        };

        window.toggleOverviewYear = function(yearVal, btn) {
            const idx = purchaseOverviewSelectedYears.indexOf(yearVal);
            if (idx === -1) {
                purchaseOverviewSelectedYears.push(yearVal);
                btn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-500 bg-blue-600 text-white transition active:scale-95 shadow-sm";
            } else {
                purchaseOverviewSelectedYears.splice(idx, 1);
                btn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition active:scale-95 shadow-sm";
            }
            renderPurchaseOverviewDashboard();
        };

        window.selectOverviewAllMonths = function(selectBool) {
            const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            purchaseOverviewSelectedMonths = [];
            monthNames.forEach((name, index) => {
                const monthVal = String(index + 1).padStart(2, '0');
                const btn = document.getElementById(`btn-overview-month-${monthVal}`);
                if (!btn) return;
                if (selectBool) {
                    purchaseOverviewSelectedMonths.push(monthVal);
                    btn.className = "px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-blue-500 bg-blue-600 text-white transition active:scale-95 shadow-sm";
                } else {
                    btn.className = "px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition active:scale-95 shadow-sm";
                }
            });
            renderPurchaseOverviewDashboard();
        };

        window.selectOverviewAllYears = function(selectBool) {
            const orders = db.purchaseOrders || [];
            const yearsList = [...new Set(orders.map(o => o.orderDate ? o.orderDate.split('-')[0] : '').filter(Boolean))].sort();
            if (yearsList.length === 0) {
                yearsList.push(new Date().getFullYear().toString());
            }
            purchaseOverviewSelectedYears = [];
            yearsList.forEach(y => {
                const btn = document.getElementById(`btn-overview-year-${y}`);
                if (!btn) return;
                if (selectBool) {
                    purchaseOverviewSelectedYears.push(y);
                    btn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-500 bg-blue-600 text-white transition active:scale-95 shadow-sm";
                } else {
                    btn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition active:scale-95 shadow-sm";
                }
            });
            renderPurchaseOverviewDashboard();
        };

        window.handleOverviewSearch = function(val) {
            purchaseOverviewSearchQuery = val.trim().toLowerCase();
            renderPurchaseOverviewDashboard();
        };

        window.handleOverviewCategory = function(val) {
            purchaseOverviewCategoryFilter = val.trim();
            renderPurchaseOverviewDashboard();
        };

        window.handleOverviewGroup = function(val) {
            purchaseOverviewGroupFilter = val.trim();
            renderPurchaseOverviewDashboard();
        };

        window.renderPurchaseOverviewDashboard = function() {
            const statCardsContainer = document.getElementById('overview-stat-cards');
            const chartContainer = document.getElementById('overview-chart-container');
            const monthlyComparisonList = document.getElementById('overview-monthly-comparison-list');
            const topProductDowns = document.getElementById('top-product-downs');
            const topProductUps = document.getElementById('top-product-ups');
            const topSupplierDowns = document.getElementById('top-supplier-downs');
            const topSupplierUps = document.getElementById('top-supplier-ups');
            const drillProductSelect = document.getElementById('overview-drill-product-select');
            const drillSupplierSelect = document.getElementById('overview-drill-supplier-select');

            if (!statCardsContainer) return;

            const orders = db.purchaseOrders || [];
            const products = db.products || [];

            // Filter orders: only ordered items (exclude drafts, wait-for-approvals)
            let activeOrders = orders.filter(o => o.status === "สั่งแล้ว" || o.status === "ได้รับครบ" || o.status === "ค้างส่ง");

            // Filter by search query (match Product ID or Product Name)
            if (purchaseOverviewSearchQuery) {
                activeOrders = activeOrders.filter(o => 
                    (o.productId || '').toLowerCase().includes(purchaseOverviewSearchQuery) ||
                    (o.productName || '').toLowerCase().includes(purchaseOverviewSearchQuery)
                );
            }

            // Filter by Category and Group
            if (purchaseOverviewCategoryFilter || purchaseOverviewGroupFilter) {
                activeOrders = activeOrders.filter(o => {
                    const prod = products.find(p => String(p.id).trim() === String(o.productId).trim());
                    if (!prod) return false;
                    if (purchaseOverviewCategoryFilter && prod.category !== purchaseOverviewCategoryFilter) return false;
                    if (purchaseOverviewGroupFilter && prod.group !== purchaseOverviewGroupFilter) return false;
                    return true;
                });
            }

            // Filter by selected Years and Months
            activeOrders = activeOrders.filter(o => {
                if (!o.orderDate || o.orderDate.length < 7) return false;
                const year = o.orderDate.split('-')[0];
                const month = o.orderDate.split('-')[1];
                
                if (purchaseOverviewSelectedYears.length > 0 && !purchaseOverviewSelectedYears.includes(year)) return false;
                if (purchaseOverviewSelectedMonths.length > 0 && !purchaseOverviewSelectedMonths.includes(month)) return false;
                return true;
            });

            // Calculate core stats
            const orderCount = activeOrders.length;
            let totalOrderedValue = 0;
            let totalReceivedValue = 0;

            activeOrders.forEach(o => {
                let cost = parseFloat(o.unitCost) || 0;
                if (cost === 0) {
                    const prod = products.find(p => String(p.id).trim() === String(o.productId).trim());
                    cost = prod ? (parseFloat(prod.cost) || 0) : 0;
                }
                totalOrderedValue += (o.orderedQty * cost);
                totalReceivedValue += (o.receivedQty * cost);
            });

            // Render Core Stat Cards
            statCardsContainer.innerHTML = `
                <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-4 animate-fade-in">
                    <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <i class="fa-solid fa-file-invoice-dollar text-xl"></i>
                    </div>
                    <div>
                        <span class="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">จำนวนครั้งที่สั่งซื้อ</span>
                        <span class="font-extrabold text-slate-800 text-xl">${orderCount.toLocaleString()} ครั้ง</span>
                    </div>
                </div>
                <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-4 animate-fade-in">
                    <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <i class="fa-solid fa-cart-shopping text-xl"></i>
                    </div>
                    <div>
                        <span class="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">มูลค่ารวมตามสั่งซื้อ</span>
                        <span class="font-extrabold text-amber-600 text-xl">฿${totalOrderedValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                </div>
                <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-4 animate-fade-in">
                    <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <i class="fa-solid fa-clipboard-check text-xl"></i>
                    </div>
                    <div>
                        <span class="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">มูลค่ารวมได้รับจริง</span>
                        <span class="font-extrabold text-emerald-600 text-xl">฿${totalReceivedValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                </div>
            `;

            // Month-by-month stats comparison
            const monthlyData = {};
            activeOrders.forEach(o => {
                if (!o.orderDate || o.orderDate.length < 7) return;
                const key = o.orderDate.substring(0, 7); // "YYYY-MM"
                if (!monthlyData[key]) {
                    monthlyData[key] = {
                        count: 0,
                        orderedVal: 0,
                        receivedVal: 0
                    };
                }
                let cost = parseFloat(o.unitCost) || 0;
                if (cost === 0) {
                    const prod = products.find(p => String(p.id).trim() === String(o.productId).trim());
                    cost = prod ? (parseFloat(prod.cost) || 0) : 0;
                }
                monthlyData[key].count++;
                monthlyData[key].orderedVal += (o.orderedQty * cost);
                monthlyData[key].receivedVal += (o.receivedQty * cost);
            });

            const sortedMonths = Object.keys(monthlyData).sort();

            function getChangePct(curr, prev) {
                if (prev === 0) return curr > 0 ? 100 : 0;
                return ((curr - prev) / prev) * 100;
            }

            let monthlyComparisonsHtml = '';
            for (let i = 0; i < sortedMonths.length; i++) {
                const monthKey = sortedMonths[i];
                const data = monthlyData[monthKey];
                
                const [year, month] = monthKey.split('-');
                const monthNamesShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                const monthNameTh = monthNamesShort[parseInt(month) - 1] + ' ' + (parseInt(year) + 543);

                let prevCount = 0;
                let prevOrdered = 0;
                let prevReceived = 0;
                if (i > 0) {
                    const prevKey = sortedMonths[i - 1];
                    prevCount = monthlyData[prevKey].count;
                    prevOrdered = monthlyData[prevKey].orderedVal;
                    prevReceived = monthlyData[prevKey].receivedVal;
                }

                const countChange = getChangePct(data.count, prevCount);
                const orderedChange = getChangePct(data.orderedVal, prevOrdered);
                const receivedChange = getChangePct(data.receivedVal, prevReceived);

                function formatBadge(pct) {
                    if (i === 0) return `<span class="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold font-mono">-</span>`;
                    if (pct > 0.05) {
                        return `<span class="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-bold inline-flex items-center gap-0.5 font-mono"><i class="fa-solid fa-arrow-trend-up"></i> +${pct.toFixed(1)}%</span>`;
                    } else if (pct < -0.05) {
                        return `<span class="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold inline-flex items-center gap-0.5 font-mono"><i class="fa-solid fa-arrow-trend-down"></i> ${pct.toFixed(1)}%</span>`;
                    } else {
                        return `<span class="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold font-mono">0.0%</span>`;
                    }
                }

                monthlyComparisonsHtml += `
                    <div class="bg-slate-50/50 border border-slate-100 rounded-xl p-3 space-y-2">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <span class="font-bold text-slate-700 text-xs">${monthNameTh}</span>
                        </div>
                        <div class="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <span class="text-[9px] text-slate-400 block font-semibold">สั่งซื้อ</span>
                                <span class="font-bold text-slate-800 text-[11px] block">${data.count} ครั้ง</span>
                                ${formatBadge(countChange)}
                            </div>
                            <div>
                                <span class="text-[9px] text-slate-400 block font-semibold">ยอดสั่งซื้อ</span>
                                <span class="font-bold text-slate-800 text-[11px] block truncate" title="฿${data.orderedVal.toLocaleString()}">฿${data.orderedVal.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                ${formatBadge(orderedChange)}
                            </div>
                            <div>
                                <span class="text-[9px] text-slate-400 block font-semibold">ได้รับจริง</span>
                                <span class="font-bold text-slate-800 text-[11px] block truncate" title="฿${data.receivedVal.toLocaleString()}">฿${data.receivedVal.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                ${formatBadge(receivedChange)}
                            </div>
                        </div>
                    </div>
                `;
            }

            if (sortedMonths.length === 0) {
                monthlyComparisonList.innerHTML = `
                    <div class="text-center py-8 text-slate-400 text-xs">
                        <i class="fa-solid fa-folder-open text-2xl mb-2 text-slate-300"></i>
                        <p>ไม่มีข้อมูลเปรียบเทียบในรายเดือน</p>
                    </div>
                `;
            } else {
                monthlyComparisonList.innerHTML = monthlyComparisonsHtml;
            }

            // Draw SVG Line Chart
            if (sortedMonths.length === 0) {
                chartContainer.innerHTML = `
                    <div class="text-center text-slate-400 text-xs">
                        <i class="fa-solid fa-chart-line text-3xl mb-2 text-slate-300"></i>
                        <p>ไม่มีข้อมูลประวัติสำหรับวาดกราฟ</p>
                    </div>
                `;
            } else {
                const w = 550;
                const h = 250;
                const paddingLeft = 60;
                const paddingRight = 20;
                const paddingTop = 30;
                const paddingBottom = 40;

                const chartWidth = w - paddingLeft - paddingRight;
                const chartHeight = h - paddingTop - paddingBottom;

                let maxVal = 1000;
                sortedMonths.forEach(k => {
                    const d = monthlyData[k];
                    if (d.orderedVal > maxVal) maxVal = d.orderedVal;
                    if (d.receivedVal > maxVal) maxVal = d.receivedVal;
                });
                const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
                const step = magnitude / 2 || 100;
                maxVal = Math.ceil(maxVal / step) * step;

                const gridCount = 4;
                let yGridHtml = '';
                for (let idx = 0; idx <= gridCount; idx++) {
                    const ratio = idx / gridCount;
                    const val = maxVal * ratio;
                    const y = h - paddingBottom - (ratio * chartHeight);
                    let formattedVal = val.toLocaleString(undefined, {maximumFractionDigits: 0});
                    if (val >= 1000000) {
                        formattedVal = (val / 1000000).toFixed(1) + 'M';
                    } else if (val >= 1000) {
                        formattedVal = (val / 1000).toFixed(0) + 'K';
                    }
                    yGridHtml += `
                        <line x1="${paddingLeft}" y1="${y}" x2="${w - paddingRight}" y2="${y}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3" />
                        <text x="${paddingLeft - 8}" y="${y + 4}" fill="#64748b" font-size="9" text-anchor="end" font-family="sans-serif">${formattedVal}</text>
                    `;
                }

                let xGridHtml = '';
                const pointsOrdered = [];
                const pointsReceived = [];

                sortedMonths.forEach((k, idx) => {
                    const d = monthlyData[k];
                    let x = paddingLeft;
                    if (sortedMonths.length > 1) {
                        x += (idx / (sortedMonths.length - 1)) * chartWidth;
                    } else {
                        x += chartWidth / 2;
                    }

                    const yOrdered = h - paddingBottom - ((d.orderedVal / maxVal) * chartHeight);
                    const yReceived = h - paddingBottom - ((d.receivedVal / maxVal) * chartHeight);

                    pointsOrdered.push({x, y: yOrdered, val: d.orderedVal});
                    pointsReceived.push({x, y: yReceived, val: d.receivedVal});

                    const [year, month] = k.split('-');
                    const shortYr = year.substring(2);
                    const monthNamesShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                    const displayLabel = monthNamesShort[parseInt(month) - 1] + shortYr;

                    xGridHtml += `
                        <text x="${x}" y="${h - paddingBottom + 16}" fill="#64748b" font-size="9" text-anchor="middle" font-family="sans-serif">${displayLabel}</text>
                        <line x1="${x}" y1="${paddingTop}" x2="${x}" y2="${h - paddingBottom}" stroke="#f1f5f9" stroke-width="1" />
                    `;
                });

                function makePath(points) {
                    if (points.length === 0) return '';
                    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
                    let pathStr = `M ${points[0].x} ${points[0].y}`;
                    for (let idx = 1; idx < points.length; idx++) {
                        pathStr += ` L ${points[idx].x} ${points[idx].y}`;
                    }
                    return pathStr;
                }

                const pathOrdered = makePath(pointsOrdered);
                const pathReceived = makePath(pointsReceived);

                let circlesHtml = '';
                pointsOrdered.forEach(p => {
                    circlesHtml += `
                        <circle cx="${p.x}" cy="${p.y}" r="4" fill="#3b82f6" stroke="#ffffff" stroke-width="1.5">
                            <title>ตามสั่งซื้อ: ฿${p.val.toLocaleString()}</title>
                        </circle>
                    `;
                });
                pointsReceived.forEach(p => {
                    circlesHtml += `
                        <circle cx="${p.x}" cy="${p.y}" r="4" fill="#10b981" stroke="#ffffff" stroke-width="1.5">
                            <title>ได้รับจริง: ฿${p.val.toLocaleString()}</title>
                        </circle>
                    `;
                });

                chartContainer.innerHTML = `
                    <svg viewBox="0 0 ${w} ${h}" class="w-full h-full">
                        ${yGridHtml}
                        ${xGridHtml}
                        ${pathOrdered ? `<path d="${pathOrdered}" fill="none" stroke="#3b82f6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />` : ''}
                        ${pathReceived ? `<path d="${pathReceived}" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />` : ''}
                        ${circlesHtml}
                        <g transform="translate(${paddingLeft}, 12)">
                            <circle cx="5" cy="5" r="4" fill="#3b82f6" />
                            <text x="15" y="8" fill="#1e293b" font-size="9" font-weight="bold" font-family="sans-serif">มูลค่ารวมตามสั่งซื้อ</text>
                            <circle cx="130" cy="5" r="4" fill="#10b981" />
                            <text x="140" y="8" fill="#1e293b" font-size="9" font-weight="bold" font-family="sans-serif">มูลค่ารวมได้รับจริง</text>
                        </g>
                    </svg>
                `;
            }

            // Products Price Analytics
            purchaseOverviewProducts = [];
            products.forEach(p => {
                const prodOrders = orders.filter(o => 
                    String(o.productId).trim() === String(p.id).trim() && 
                    (o.status === "สั่งแล้ว" || o.status === "ได้รับครบ" || o.status === "ค้างส่ง")
                ).sort((a, b) => (a.orderDate || '').localeCompare(b.orderDate || ''));

                if (prodOrders.length < 2) return;

                const prices = prodOrders.map(o => {
                    let c = parseFloat(o.unitCost) || 0;
                    if (c === 0) c = parseFloat(p.cost) || 0;
                    return c;
                }).filter(c => c > 0);

                if (prices.length < 2) return;

                const firstPrice = prices[0];
                const lastPrice = prices[prices.length - 1];
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);

                const diff = lastPrice - firstPrice;
                const pct = (diff / firstPrice) * 100;
                const volatility = minPrice > 0 ? (((maxPrice - minPrice) / minPrice) * 100) : 0;

                purchaseOverviewProducts.push({
                    productId: p.id,
                    productName: p.name,
                    category: p.category || '',
                    group: p.group || '',
                    firstPrice,
                    lastPrice,
                    diff,
                    pct,
                    volatility,
                    history: prodOrders.map((o, idx) => ({
                        date: o.orderDate || '-',
                        po: o.poNumber,
                        pr: o.prNumber,
                        qty: o.orderedQty,
                        cost: prices[idx] || 0,
                        supplier: o.supplier || p.supplier || 'ไม่ระบุ'
                    }))
                });
            });

            let filteredProductsAnalysis = purchaseOverviewProducts;
            if (purchaseOverviewSearchQuery) {
                filteredProductsAnalysis = filteredProductsAnalysis.filter(x => 
                    x.productId.toLowerCase().includes(purchaseOverviewSearchQuery) ||
                    x.productName.toLowerCase().includes(purchaseOverviewSearchQuery)
                );
            }
            if (purchaseOverviewCategoryFilter) {
                filteredProductsAnalysis = filteredProductsAnalysis.filter(x => x.category === purchaseOverviewCategoryFilter);
            }
            if (purchaseOverviewGroupFilter) {
                filteredProductsAnalysis = filteredProductsAnalysis.filter(x => x.group === purchaseOverviewGroupFilter);
            }

            const topUps = [...filteredProductsAnalysis].filter(x => x.diff > 0.01).sort((a, b) => b.pct - a.pct).slice(0, 10);
            const topDowns = [...filteredProductsAnalysis].filter(x => x.diff < -0.01).sort((a, b) => a.pct - b.pct).slice(0, 10);

            topProductDowns.innerHTML = topDowns.map(x => `
                <tr class="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td class="p-2 text-slate-700 font-semibold truncate max-w-[120px]" title="${escapeHTML(x.productName)}">
                        <span class="font-mono text-[9px] text-slate-400 block">${escapeHTML(x.productId)}</span>
                        ${escapeHTML(x.productName)}
                    </td>
                    <td class="p-2 text-right text-emerald-600 font-mono">฿${Math.abs(x.diff).toFixed(1)}</td>
                    <td class="p-2 text-right text-emerald-600 font-bold font-mono">${x.pct.toFixed(1)}%</td>
                </tr>
            `).join('') || `<tr><td colspan="3" class="p-4 text-center text-slate-400">ไม่มีรายการราคาลดลง</td></tr>`;

            topProductUps.innerHTML = topUps.map(x => `
                <tr class="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td class="p-2 text-slate-700 font-semibold truncate max-w-[120px]" title="${escapeHTML(x.productName)}">
                        <span class="font-mono text-[9px] text-slate-400 block">${escapeHTML(x.productId)}</span>
                        ${escapeHTML(x.productName)}
                    </td>
                    <td class="p-2 text-right text-rose-600 font-mono">฿${x.diff.toFixed(1)}</td>
                    <td class="p-2 text-right text-rose-600 font-bold font-mono">+${x.pct.toFixed(1)}%</td>
                </tr>
            `).join('') || `<tr><td colspan="3" class="p-4 text-center text-slate-400">ไม่มีรายการราคาเพิ่มขึ้น</td></tr>`;

            // Drill down product select options
            const prevDrillVal = drillProductSelect.value;
            drillProductSelect.innerHTML = '<option value="">เลือกสินค้าเพื่อวิเคราะห์...</option>';
            purchaseOverviewProducts.sort((a, b) => a.productName.localeCompare(b.productName)).forEach(x => {
                const selectedAttr = x.productId === prevDrillVal ? 'selected' : '';
                drillProductSelect.insertAdjacentHTML('beforeend', `
                    <option value="${escapeHTML(x.productId)}" ${selectedAttr}>${escapeHTML(x.productName)} (${escapeHTML(x.productId)})</option>
                `);
            });
            if (prevDrillVal && purchaseOverviewProducts.some(x => x.productId === prevDrillVal)) {
                drillProductPriceTrend(prevDrillVal);
            }

            // Suppliers Price Analytics
            purchaseOverviewSuppliers = [];
            const supplierProducts = {};
            orders.filter(o => 
                o.status === "สั่งแล้ว" || o.status === "ได้รับครบ" || o.status === "ค้างส่ง"
            ).forEach(o => {
                const supplierName = o.supplier || 'ไม่ระบุ';
                if (!supplierProducts[supplierName]) {
                    supplierProducts[supplierName] = {};
                }
                const prodId = o.productId;
                if (!supplierProducts[supplierName][prodId]) {
                    supplierProducts[supplierName][prodId] = [];
                }
                const prod = products.find(p => String(p.id).trim() === String(prodId).trim());
                let c = parseFloat(o.unitCost) || 0;
                if (c === 0 && prod) c = parseFloat(prod.cost) || 0;
                if (c > 0) {
                    supplierProducts[supplierName][prodId].push({
                        date: o.orderDate || '-',
                        price: c,
                        po: o.poNumber,
                        pr: o.prNumber,
                        qty: o.orderedQty,
                        productName: o.productName
                    });
                }
            });

            Object.keys(supplierProducts).forEach(supName => {
                const prodMap = supplierProducts[supName];
                const productsList = Object.keys(prodMap);
                
                let totalPct = 0;
                let totalVol = 0;
                let countCalculated = 0;
                const historyList = [];

                productsList.forEach(prodId => {
                    const priceLogs = prodMap[prodId].sort((a, b) => a.date.localeCompare(b.date));
                    if (priceLogs.length < 2) return;

                    const firstPrice = priceLogs[0].price;
                    const lastPrice = priceLogs[priceLogs.length - 1].price;
                    const minPrice = Math.min(...priceLogs.map(l => l.price));
                    const maxPrice = Math.max(...priceLogs.map(l => l.price));

                    const diff = lastPrice - firstPrice;
                    const pct = (diff / firstPrice) * 100;
                    const volatility = minPrice > 0 ? (((maxPrice - minPrice) / minPrice) * 100) : 0;

                    totalPct += pct;
                    totalVol += volatility;
                    countCalculated++;

                    priceLogs.forEach(log => {
                        historyList.push({
                            date: log.date,
                            productId: prodId,
                            productName: log.productName,
                            price: log.price,
                            po: log.po,
                            pr: log.pr,
                            qty: log.qty
                        });
                    });
                });

                if (countCalculated > 0) {
                    const avgPct = totalPct / countCalculated;
                    const avgVol = totalVol / countCalculated;

                    purchaseOverviewSuppliers.push({
                        supplierName: supName,
                        avgPct,
                        avgVol,
                        history: historyList.sort((a, b) => a.date.localeCompare(b.date))
                    });
                }
            });

            let filteredSupplierAnalysis = purchaseOverviewSuppliers;
            if (purchaseOverviewSearchQuery) {
                filteredSupplierAnalysis = filteredSupplierAnalysis.filter(x => 
                    x.supplierName.toLowerCase().includes(purchaseOverviewSearchQuery)
                );
            }

            const topSupUps = [...filteredSupplierAnalysis].filter(x => x.avgPct > 0.01).sort((a, b) => b.avgPct - a.avgPct).slice(0, 10);
            const topSupDowns = [...filteredSupplierAnalysis].filter(x => x.avgPct < -0.01).sort((a, b) => a.avgPct - b.avgPct).slice(0, 10);

            topSupplierDowns.innerHTML = topSupDowns.map(x => `
                <tr class="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td class="p-2 text-slate-700 font-semibold truncate max-w-[120px]" title="${escapeHTML(x.supplierName)}">
                        ${escapeHTML(x.supplierName)}
                    </td>
                    <td class="p-2 text-right text-emerald-600 font-mono">${Math.abs(x.avgPct).toFixed(1)}%</td>
                    <td class="p-2 text-right text-emerald-600 font-bold font-mono">${x.avgPct.toFixed(1)}%</td>
                </tr>
            `).join('') || `<tr><td colspan="3" class="p-4 text-center text-slate-400">ไม่มีรายการลดลง</td></tr>`;

            topSupplierUps.innerHTML = topSupUps.map(x => `
                <tr class="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td class="p-2 text-slate-700 font-semibold truncate max-w-[120px]" title="${escapeHTML(x.supplierName)}">
                        ${escapeHTML(x.supplierName)}
                    </td>
                    <td class="p-2 text-right text-rose-600 font-mono">+${x.avgPct.toFixed(1)}%</td>
                    <td class="p-2 text-right text-rose-600 font-bold font-mono">+${x.avgPct.toFixed(1)}%</td>
                </tr>
            `).join('') || `<tr><td colspan="3" class="p-4 text-center text-slate-400">ไม่มีรายการเพิ่มขึ้น</td></tr>`;

            // Drill down supplier select options
            const prevDrillSupVal = drillSupplierSelect.value;
            drillSupplierSelect.innerHTML = '<option value="">เลือก Supplier...</option>';
            purchaseOverviewSuppliers.sort((a, b) => a.supplierName.localeCompare(b.supplierName)).forEach(x => {
                const selectedAttr = x.supplierName === prevDrillSupVal ? 'selected' : '';
                drillSupplierSelect.insertAdjacentHTML('beforeend', `
                    <option value="${escapeHTML(x.supplierName)}" ${selectedAttr}>${escapeHTML(x.supplierName)}</option>
                `);
            });
            if (prevDrillSupVal && purchaseOverviewSuppliers.some(x => x.supplierName === prevDrillSupVal)) {
                drillSupplierPriceTrend(prevDrillSupVal);
            }
        };

        window.drillProductPriceTrend = function(productId) {
            const timelineContainer = document.getElementById('product-drilldown-timeline');
            if (!timelineContainer) return;

            if (!productId) {
                timelineContainer.classList.add('hidden');
                timelineContainer.innerHTML = '';
                return;
            }

            const prod = purchaseOverviewProducts.find(x => x.productId === productId);
            if (!prod) {
                timelineContainer.classList.add('hidden');
                timelineContainer.innerHTML = '';
                return;
            }

            timelineContainer.classList.remove('hidden');
            let timelineHtml = `
                <div class="text-[11px] font-bold text-slate-700 border-b border-slate-200 pb-1.5 mb-2 flex justify-between">
                    <span>ประวัติราคา: ${escapeHTML(prod.productName)}</span>
                    <span class="text-amber-600">ผันผวนสะสม: ${prod.volatility.toFixed(1)}%</span>
                </div>
            `;

            prod.history.forEach((h, idx) => {
                let diffText = '-';
                if (idx > 0) {
                    const prevCost = prod.history[idx - 1].cost;
                    const change = h.cost - prevCost;
                    const pct = prevCost > 0 ? (change / prevCost * 100) : 0;
                    if (pct > 0.05) {
                        diffText = `<span class="text-rose-600 font-bold"><i class="fa-solid fa-arrow-trend-up"></i> +${pct.toFixed(1)}%</span>`;
                    } else if (pct < -0.05) {
                        diffText = `<span class="text-emerald-600 font-bold"><i class="fa-solid fa-arrow-trend-down"></i> ${pct.toFixed(1)}%</span>`;
                    } else {
                        diffText = `<span class="text-slate-400">คงที่</span>`;
                    }
                }

                timelineHtml += `
                    <div class="flex items-center justify-between text-[10px] border-b border-slate-100 py-1.5 last:border-0">
                        <div class="space-y-0.5">
                            <div class="font-semibold text-slate-700">${escapeHTML(h.date)} &bull; PO: ${escapeHTML(h.po || '-')}</div>
                            <div class="text-slate-400 text-[9px]">คู่ค้า: ${escapeHTML(h.supplier)} &bull; จำนวน: ${h.qty}</div>
                        </div>
                        <div class="text-right">
                            <div class="font-mono font-bold text-slate-800">฿${h.cost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                            <div>${diffText}</div>
                        </div>
                    </div>
                `;
            });

            timelineContainer.innerHTML = timelineHtml;
        };

        window.drillSupplierPriceTrend = function(supplierName) {
            const timelineContainer = document.getElementById('supplier-drilldown-timeline');
            if (!timelineContainer) return;

            if (!supplierName) {
                timelineContainer.classList.add('hidden');
                timelineContainer.innerHTML = '';
                return;
            }

            const sup = purchaseOverviewSuppliers.find(x => x.supplierName === supplierName);
            if (!sup) {
                timelineContainer.classList.add('hidden');
                timelineContainer.innerHTML = '';
                return;
            }

            timelineContainer.classList.remove('hidden');
            let timelineHtml = `
                <div class="text-[11px] font-bold text-slate-700 border-b border-slate-200 pb-1.5 mb-2 flex justify-between">
                    <span>ประวัติราคา: ${escapeHTML(sup.supplierName)}</span>
                    <span class="text-indigo-600">ผันผวนเฉลี่ย: ${sup.avgVol.toFixed(1)}%</span>
                </div>
            `;

            sup.history.forEach(h => {
                timelineHtml += `
                    <div class="flex items-center justify-between text-[10px] border-b border-slate-100 py-1.5 last:border-0">
                        <div class="space-y-0.5">
                            <div class="font-semibold text-slate-700">${escapeHTML(h.date)} &bull; PO: ${escapeHTML(h.po || '-')}</div>
                            <div class="text-slate-500 font-medium">${escapeHTML(h.productName)} (${escapeHTML(h.productId)})</div>
                        </div>
                        <div class="text-right">
                            <div class="font-mono font-bold text-slate-800">฿${h.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                            <div class="text-slate-400 text-[9px]">จำนวน: ${h.qty}</div>
                        </div>
                    </div>
                `;
            });

            timelineContainer.innerHTML = timelineHtml;
        };

// ==========================================
// Firebase Direct Backend Bypass Interceptor
// ==========================================

const BYPASS_ACTIONS = [
    'editProduct',
    'editMachine',
    'editManual',
    'getTransactions',
    'checkoutOrder',
    'restockProduct',
    'cancelTransaction',
    'deleteTransaction',
    'addMapping',
    'deleteMapping',
    'saveSettings',
    'getUsersList',
    'loginUser',
    'registerUser',
    'updateUserByAdmin',
    'deleteUserByAdmin',
    'updateSelfProfile',
    'addPurchaseOrderDraft',
    'editPurchaseOrderDraft',
    'deletePurchaseOrderDraft',
    'deletePurchaseOrderActive',
    'updatePurchaseOrderDraft',
    'receivePurchaseGoods'
];

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getFormattedDateTimeString() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

async function handleActionDirectlyOnFirebase(action, payload) {
    try {
        switch (action) {
            case 'editProduct':
                await executeDirectEditProduct(payload);
                return { status: 'success', message: 'บันทึกแก้ไขสินค้าสำเร็จ' };
            case 'editMachine':
                await executeDirectEditMachine(payload);
                return { status: 'success', message: 'บันทึกแก้ไขเครื่องจักรสำเร็จ' };
            case 'editManual':
                const manualRes = await executeDirectEditManual(payload);
                return { status: 'success', data: manualRes, message: 'บันทึกแก้ไขคู่มือสำเร็จ' };
            case 'getTransactions':
                return { status: 'success', data: await executeDirectGetTransactions() };
            case 'loginUser':
                return { status: 'success', data: await executeDirectLogin(payload) };
            case 'registerUser':
                await executeDirectRegister(payload);
                return { status: 'success', message: 'สมัครสมาชิกสำเร็จ รอการอนุมัติสิทธิ์' };
            case 'getUsersList':
                return { status: 'success', data: await executeDirectGetUsersList(payload) };
            case 'updateUserByAdmin':
                await executeDirectUpdateUserByAdmin(payload);
                return { status: 'success', message: 'อัปเดตข้อมูลผู้ใช้สำเร็จ' };
            case 'deleteUserByAdmin':
                await executeDirectDeleteUserByAdmin(payload);
                return { status: 'success', message: 'ลบผู้ใช้สำเร็จ' };
            case 'updateSelfProfile':
                return { status: 'success', data: await executeDirectUpdateSelfProfile(payload), message: 'อัปเดตโปรไฟล์สำเร็จ' };
            case 'checkoutOrder':
                return { status: 'success', data: await executeDirectCheckout(payload) };
            case 'restockProduct':
                return { status: 'success', data: await executeDirectRestock(payload) };
            case 'cancelTransaction':
                await executeDirectCancelTransaction(payload);
                return { status: 'success', message: 'ยกเลิกใบเบิกสำเร็จ คืนสต็อกอะไหล่เข้าคลังเรียบร้อยแล้ว' };
            case 'deleteTransaction':
                await executeDirectDeleteTransaction(payload);
                return { status: 'success', message: 'ลบประวัติใบเบิกสำเร็จเรียบร้อยแล้ว' };
            case 'addMapping':
                await executeDirectAddMapping(payload);
                return { status: 'success', message: 'บันทึกการจับคู่สำเร็จ' };
            case 'deleteMapping':
                await executeDirectDeleteMapping(payload);
                return { status: 'success', message: 'ยกเลิกการจับคู่สำเร็จ' };
            case 'saveSettings':
                await executeDirectSaveSettings(payload);
                return { status: 'success', message: 'บันทึกตั้งค่าสำเร็จ' };
            case 'addPurchaseOrderDraft':
                return { status: 'success', data: await executeDirectAddPurchaseOrderDraft(payload) };
            case 'editPurchaseOrderDraft':
                await executeDirectEditPurchaseOrderDraft(payload);
                return { status: 'success', message: 'แก้ไขจำนวนสั่งซื้อสำเร็จ' };
            case 'deletePurchaseOrderDraft':
                await executeDirectDeletePurchaseOrderDraft(payload);
                return { status: 'success', message: 'ลบรายการสั่งซื้อสำเร็จ' };
            case 'deletePurchaseOrderActive':
                await executeDirectDeletePurchaseOrderActive(payload);
                return { status: 'success', message: 'ลบรายการจัดซื้อสำเร็จ' };
            case 'updatePurchaseOrderDraft':
                await executeDirectUpdatePurchaseOrderDraft(payload);
                return { status: 'success', message: 'บันทึกการแก้ไขใบจัดซื้อสำเร็จ' };
            case 'receivePurchaseGoods':
                return { status: 'success', data: await executeDirectReceivePurchaseGoods(payload) };
            default:
                throw new Error("Action not supported directly on Firebase");
        }
    } catch (e) {
        return { status: 'error', message: e.message };
    }
}

let transactionsCache = null;

async function executeDirectEditProduct(payload) {
    const snapshot = await firebase.database().ref('appData/products').get();
    let products = ensureArray(snapshot.val());
    const index = products.findIndex(p => String(p.id).trim() === String(payload.id).trim());
    if (index === -1) throw new Error("ไม่พบรหัสสินค้าที่ต้องการแก้ไข");
    const oldProduct = products[index];
    const cost = parseFloat(payload.cost) || 0;
    
    let factorA = 1.05, factorB = 1.10, factorC = 1.20;
    if (cost >= 10000) { factorA = 1.02; factorB = 1.05; factorC = 1.10; }
    else if (cost >= 5000) { factorA = 1.03; factorB = 1.07; factorC = 1.15; }
    
    const pA = parseFloat(payload.price_a) > 0 ? parseFloat(payload.price_a) : Math.ceil(cost * factorA);
    const pB = parseFloat(payload.price_b) > 0 ? parseFloat(payload.price_b) : Math.ceil(cost * factorB);
    const pC = parseFloat(payload.price_c) > 0 ? parseFloat(payload.price_c) : Math.ceil(cost * factorC);
    const stockQty = (payload.stock_qty !== undefined && payload.stock_qty !== "") ? parseFloat(payload.stock_qty) : (parseFloat(oldProduct.stock_qty) || 0);
    
    products[index] = {
        id: payload.id, name: payload.name, unit: payload.unit, cost: cost,
        price_a: pA, price_b: pB, price_c: pC,
        category: payload.category, note: payload.note, image_url: oldProduct.image_url || "",
        stock_qty: stockQty, group: payload.group || "", supplier: payload.supplier || "", storage: payload.storage || ""
    };
    await firebase.database().ref('appData/products').set(products);
    db.products = products;
    invalidateLocalCache();
}

async function executeDirectEditMachine(payload) {
    const snapshot = await firebase.database().ref('appData/machines').get();
    let machines = ensureArray(snapshot.val());
    const index = machines.findIndex(m => String(m.id).trim() === String(payload.id).trim());
    if (index === -1) throw new Error("ไม่พบเครื่องจักรที่ต้องการแก้ไข");
    const oldMachine = machines[index];
    machines[index] = {
        id: payload.id, name: payload.name, image_url: oldMachine.image_url || "", cost: parseFloat(payload.cost) || 0,
        price_a: parseFloat(payload.price_a) || 0, price_b: parseFloat(payload.price_b) || 0, price_c: parseFloat(payload.price_c) || 0,
        note: payload.note || "", group: payload.group || "", supplier: payload.supplier || "", storage: payload.storage || ""
    };
    await firebase.database().ref('appData/machines').set(machines);
    db.machines = machines;
    invalidateLocalCache();
}

async function executeDirectEditManual(payload) {
    const snapshot = await firebase.database().ref('appData/manuals').get();
    let manuals = ensureArray(snapshot.val());
    const index = manuals.findIndex(m => String(m.id).trim() === String(payload.id).trim());
    if (index === -1) throw new Error("ไม่พบคู่มือที่ต้องการแก้ไข");
    const oldManual = manuals[index];
    manuals[index] = {
        id: payload.id, title: payload.title || "", description: payload.description || "",
        file_url: oldManual.file_url || "", file_type: payload.file_type || oldManual.file_type,
        uploaded_at: oldManual.uploaded_at || ""
    };
    await firebase.database().ref('appData/manuals').set(manuals);
    db.manuals = manuals;
    invalidateLocalCache();
    return { file_url: oldManual.file_url || "" };
}

async function executeDirectGetTransactions() {
    if (transactionsCache) {
        console.log("[Firebase Bypass] Returning transactions from memory cache");
        return transactionsCache;
    }
    const snapshot = await firebase.database().ref('transactions').get();
    transactionsCache = ensureArray(snapshot.val()).reverse();
    return transactionsCache;
}

async function executeDirectLogin(payload) {
    const username = String(payload.username).trim().toLowerCase();
    const password = String(payload.password);
    if (!username || !password) throw new Error("กรุณากรอกข้อมูลการเข้าสู่ระบบ");
    
    const snapshot = await firebase.database().ref('users').get();
    const users = ensureArray(snapshot.val());
    const hash = await sha256(password);
    
    const user = users.find(u => (String(u.email).toLowerCase() === username || String(u.phone).trim() === username));
    if (!user) throw new Error("ไม่พบชื่อผู้ใช้ (อีเมลหรือเบอร์โทรศัพท์) ในระบบ");
    if (user.passwordHash !== hash) throw new Error("รหัสผ่านไม่ถูกต้อง");
    
    return {
        fullName: user.fullName,
        department: user.department,
        phone: user.phone,
        email: user.email,
        role: user.role,
        priceLevel: user.priceLevel || "A",
        userType: user.userType || "insource"
    };
}

async function executeDirectRegister(payload) {
    const fullName = String(payload.fullName || "").trim();
    const department = String(payload.department || "").trim();
    const phone = String(payload.phone || "").trim();
    const email = String(payload.email || "").trim().toLowerCase();
    const password = String(payload.password || "");
    const userType = payload.userType ? String(payload.userType).trim() : "";
    if (!fullName || !department || !phone || !email || !password || !userType) {
        throw new Error("กรุณากรอกข้อมูลและเลือกประเภทบุคคลให้ครบถ้วน");
    }
    
    const snapshot = await firebase.database().ref('users').get();
    const users = ensureArray(snapshot.val());
    
    if (users.some(u => String(u.email || "").toLowerCase() === email)) throw new Error("อีเมลนี้ถูกใช้สมัครสมาชิกแล้ว");
    if (users.some(u => String(u.phone || "").trim() === phone)) throw new Error("เบอร์โทรศัพท์นี้ถูกใช้สมัครสมาชิกแล้ว");
    
    const newUser = {
        fullName: fullName,
        department: department,
        phone: phone,
        email: email,
        passwordHash: await sha256(password),
        role: "user",
        priceLevel: "A",
        userType: userType
    };
    users.push(newUser);
    await firebase.database().ref('users').set(users);
    invalidateLocalCache();
}

async function executeDirectGetUsersList(payload) {
    const snapshot = await firebase.database().ref('users').get();
    return ensureArray(snapshot.val());
}

async function executeDirectUpdateUserByAdmin(payload) {
    const email = String(payload.targetEmail || payload.email || "").trim().toLowerCase();
    const snapshot = await firebase.database().ref('users').get();
    const users = ensureArray(snapshot.val());
    
    const index = users.findIndex(u => String(u.email || "").toLowerCase() === email);
    if (index === -1) throw new Error("ไม่พบอีเมลผู้ใช้ที่ต้องการแก้ไข");
    
    users[index].fullName = String(payload.fullName || users[index].fullName).trim();
    users[index].department = String(payload.department || users[index].department).trim();
    users[index].phone = String(payload.phone || users[index].phone).trim();
    users[index].role = String(payload.newRole || payload.role || users[index].role).trim();
    users[index].priceLevel = String(payload.newPriceLevel || payload.priceLevel || users[index].priceLevel || "A").trim();
    users[index].userType = String(payload.newUserType || payload.userType || users[index].userType || "insource").trim();
    
    if (payload.password) {
        users[index].passwordHash = await sha256(payload.password);
    }
    await firebase.database().ref('users').set(users);
    invalidateLocalCache();
}

async function executeDirectDeleteUserByAdmin(payload) {
    const email = String(payload.targetEmail || payload.email || "").trim().toLowerCase();
    const snapshot = await firebase.database().ref('users').get();
    let users = ensureArray(snapshot.val());
    
    users = users.filter(u => String(u.email || "").toLowerCase() !== email);
    await firebase.database().ref('users').set(users);
    invalidateLocalCache();
}

async function executeDirectUpdateSelfProfile(payload) {
    const currentEmail = String(payload.currentEmail || "").trim().toLowerCase();
    const snapshot = await firebase.database().ref('users').get();
    const users = ensureArray(snapshot.val());
    
    const index = users.findIndex(u => String(u.email || "").toLowerCase() === currentEmail);
    if (index === -1) throw new Error("ไม่พบข้อมูลบัญชีผู้ใช้ในระบบ");
    
    const newEmail = String(payload.email || "").trim().toLowerCase();
    if (newEmail !== currentEmail && users.some(u => String(u.email || "").toLowerCase() === newEmail)) {
        throw new Error("อีเมลใหม่นี้ถูกใช้งานแล้ว");
    }
    
    users[index].fullName = String(payload.fullName || users[index].fullName).trim();
    users[index].department = String(payload.department || users[index].department).trim();
    users[index].phone = String(payload.phone || users[index].phone).trim();
    users[index].email = newEmail;
    
    if (payload.password) {
        users[index].passwordHash = await sha256(payload.password);
    }
    
    await firebase.database().ref('users').set(users);
    invalidateLocalCache();
    
    return {
        fullName: users[index].fullName,
        department: users[index].department,
        phone: users[index].phone,
        email: users[index].email,
        role: users[index].role,
        priceLevel: users[index].priceLevel || "A",
        userType: users[index].userType || "insource"
    };
}

async function executeDirectCheckout(payload) {
    const snapshot = await firebase.database().ref().get();
    const fbData = snapshot.val() || {};
    
    let products = ensureArray(fbData.appData?.products);
    let lots = ensureArray(fbData.lots);
    let transactions = ensureArray(fbData.transactions);
    
    const cart = payload.cart;
    const prodMap = {};
    products.forEach(p => {
        prodMap[p.id] = p;
    });
    
    // ตรวจสอบสต็อก
    cart.forEach(item => {
        const product = prodMap[item.id];
        if (!product) throw new Error("ไม่พบอะไหล่รหัส " + item.id + " ในระบบ");
        
        const stockQty = parseFloat(product.stock_qty) || 0;
        if (stockQty < item.qty) {
            throw new Error("สต็อกไม่เพียงพอ: อะไหล่ " + product.name + " (" + item.id + ") มีคงเหลือ " + stockQty + " ชิ้น แต่พยายามเบิก " + item.qty + " ชิ้น");
        }
        
        const prodLots = lots.filter(l => String(l.product_id).trim() === String(item.id).trim() && (parseFloat(l.remaining_qty) || 0) > 0);
        const totalLotQty = prodLots.reduce((sum, l) => sum + (parseFloat(l.remaining_qty) || 0), 0);
        if (totalLotQty < stockQty) {
            const diff = stockQty - totalLotQty;
            lots.push({
                lot_id: "LOT-SUPP-" + item.id + "-" + Date.now(),
                product_id: item.id,
                cost: parseFloat(product.cost) || 0,
                price_a: parseFloat(product.price_a) || 0,
                price_b: parseFloat(product.price_b) || 0,
                price_c: parseFloat(product.price_c) || 0,
                initial_qty: diff,
                remaining_qty: diff,
                created_at: getFormattedDateTimeString(),
                note: "Lot สำรองคงเหลือ"
            });
        }
    });
    
    // ตัดสต็อก FIFO
    const checkoutItems = [];
    cart.forEach(item => {
        const product = prodMap[item.id];
        let neededQty = item.qty;
        
        const availableLots = lots.filter(l => String(l.product_id).trim() === String(item.id).trim() && (parseFloat(l.remaining_qty) || 0) > 0)
                                  .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
        
        availableLots.forEach(lot => {
            if (neededQty <= 0) return;
            const remaining = parseFloat(lot.remaining_qty) || 0;
            const takeQty = Math.min(remaining, neededQty);
            
            lot.remaining_qty = remaining - takeQty;
            neededQty -= takeQty;
            
            let lotPrice = item.price;
            if (item.priceLevel === 'A' && lot.price_a) lotPrice = parseFloat(lot.price_a) || 0;
            else if (item.priceLevel === 'B' && lot.price_b) lotPrice = parseFloat(lot.price_b) || 0;
            else if (item.priceLevel === 'C' && lot.price_c) lotPrice = parseFloat(lot.price_c) || 0;
            
            checkoutItems.push({
                detail_id: "",
                product_id: item.id,
                lot_id: lot.lot_id,
                qty: takeQty,
                unit_cost: parseFloat(lot.cost) || 0,
                price: lotPrice,
                subtotal: takeQty * lotPrice
            });
        });
        
        product.stock_qty = (parseFloat(product.stock_qty) || 0) - item.qty;
    });
    
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const datePrefix = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const dateStr = getFormattedDateTimeString();
    
    let counter = 1;
    if (transactions.length > 0) {
        const lastTx = transactions[transactions.length - 1];
        if (lastTx && lastTx.id && String(lastTx.id).indexOf("LDT-" + datePrefix) === 0) {
            const parts = String(lastTx.id).split("-");
            const lastNum = parseInt(parts[2], 10);
            if (!isNaN(lastNum)) counter = lastNum + 1;
        }
    }
    const txId = "LDT-" + datePrefix + "-" + String(counter).padStart(4, '0');
    
    let calcTotalPrice = 0;
    checkoutItems.forEach((it, idx) => {
        it.detail_id = txId + "-" + (idx + 1);
        calcTotalPrice += it.subtotal;
    });
    
    const newTransaction = {
        id: txId,
        date: dateStr,
        requester: payload.requester,
        department: payload.department,
        machine_id: payload.machine_id,
        serial_number: payload.serial_number || "",
        total_price: payload.total_price || calcTotalPrice,
        note: payload.note || "",
        status: "Success",
        items: checkoutItems
    };
    transactions.push(newTransaction);
    
    const updates = {};
    updates["appData/products"] = products;
    updates["lots"] = lots;
    updates["transactions"] = transactions;
    await firebase.database().ref().update(updates);
    transactionsCache = null; // Invalidate cache
    
    db.products = products;
    db.lots = lots;
    db.transactions = transactions;
    invalidateLocalCache();
    
    return { transaction_id: txId, items: checkoutItems };
}

async function executeDirectRestock(payload) {
    const snapshot = await firebase.database().ref().get();
    const fbData = snapshot.val() || {};
    
    let products = ensureArray(fbData.appData?.products);
    let lots = ensureArray(fbData.lots);
    let transactions = ensureArray(fbData.transactions);
    
    const product = products.find(p => String(p.id).trim() === String(payload.id).trim());
    if (!product) throw new Error("ไม่พบของต้องการปรับปรุงสต็อก");
    
    const qty = parseFloat(payload.qty) || 0;
    const cost = (payload.cost !== undefined && payload.cost !== "") ? parseFloat(payload.cost) : (parseFloat(product.cost) || 0);
    const pA = (payload.price_a !== undefined && payload.price_a !== "") ? parseFloat(payload.price_a) : (parseFloat(product.price_a) || 0);
    const pB = (payload.price_b !== undefined && payload.price_b !== "") ? parseFloat(payload.price_b) : (parseFloat(product.price_b) || 0);
    const pC = (payload.price_c !== undefined && payload.price_c !== "") ? parseFloat(payload.price_c) : (parseFloat(product.price_c) || 0);
    
    const lotId = "LOT-" + payload.id + "-" + Date.now();
    lots.push({
        lot_id: lotId,
        product_id: payload.id,
        cost: cost,
        price_a: pA,
        price_b: pB,
        price_c: pC,
        initial_qty: qty,
        remaining_qty: qty,
        created_at: getFormattedDateTimeString(),
        note: payload.note || "เติมสต็อกสินค้า"
    });
    
    product.stock_qty = (parseFloat(product.stock_qty) || 0) + qty;
    product.cost = cost;
    product.price_a = pA;
    product.price_b = pB;
    product.price_c = pC;
    
    let lastTxId = 0;
    if (transactions.length > 0) {
        const lastTx = transactions[transactions.length - 1];
        lastTxId = parseInt(String(lastTx.id).replace("TX-", "")) || 0;
    }
    const nextTxId = "TX-" + String(lastTxId + 1).padStart(6, '0');
    
    const newRestockTransaction = {
        id: nextTxId,
        requester: payload.requester,
        department: payload.department || "สโตร์ (Restock)",
        machine_id: "RESTOCK",
        serial_number: "",
        total_price: 0,
        note: payload.note || "เติมสต็อกสินค้า",
        created_at: getFormattedDateTimeString(),
        status: "Restock",
        items: [{
            lot_id: lotId,
            product_id: payload.id,
            qty: qty,
            cost: cost,
            price: 0
        }]
    };
    transactions.push(newRestockTransaction);
    
    const updates = {};
    updates["appData/products"] = products;
    updates["lots"] = lots;
    updates["transactions"] = transactions;
    await firebase.database().ref().update(updates);
    transactionsCache = null; // Invalidate cache
    
    db.products = products;
    db.lots = lots;
    db.transactions = transactions;
    invalidateLocalCache();
    
    return { new_stock: product.stock_qty, transaction_id: nextTxId, lot_id: lotId };
}

async function executeDirectCancelTransaction(payload) {
    const snapshot = await firebase.database().ref().get();
    const fbData = snapshot.val() || {};
    
    let products = ensureArray(fbData.appData?.products);
    let lots = ensureArray(fbData.lots);
    let transactions = ensureArray(fbData.transactions);
    
    const txId = String(payload.transaction_id).trim();
    const txIndex = transactions.findIndex(t => t.id === txId);
    if (txIndex === -1) throw new Error("ไม่พบรหัสใบเบิก " + txId);
    
    const targetTx = transactions[txIndex];
    if (targetTx.status === "Cancelled") throw new Error("ใบเบิกนี้ถูกยกเลิกไปแล้ว");
    
    targetTx.items.forEach(item => {
        const prod = products.find(p => String(p.id).trim() === String(item.product_id).trim());
        if (prod) {
            prod.stock_qty = (parseFloat(prod.stock_qty) || 0) + item.qty;
        }
        if (item.lot_id) {
            const lot = lots.find(l => l.lot_id === item.lot_id);
            if (lot) {
                lot.remaining_qty = (parseFloat(lot.remaining_qty) || 0) + item.qty;
            }
        }
    });
    
    transactions[txIndex].status = "Cancelled";
    
    const updates = {};
    updates["appData/products"] = products;
    updates["lots"] = lots;
    updates["transactions"] = transactions;
    await firebase.database().ref().update(updates);
    transactionsCache = null; // Invalidate cache
    
    db.products = products;
    db.lots = lots;
    db.transactions = transactions;
    invalidateLocalCache();
}

async function executeDirectDeleteTransaction(payload) {
    const snapshot = await firebase.database().ref('transactions').get();
    let transactions = ensureArray(snapshot.val());
    
    const txId = String(payload.transaction_id).trim();
    transactions = transactions.filter(t => t.id !== txId);
    
    await firebase.database().ref('transactions').set(transactions);
    transactionsCache = null; // Invalidate cache
    db.transactions = transactions;
    invalidateLocalCache();
}

async function executeDirectAddMapping(payload) {
    const snapshot = await firebase.database().ref('mappings').get();
    let mappings = ensureArray(snapshot.val());
    
    let productIds = Array.isArray(payload.product_ids) ? payload.product_ids : [payload.product_id];
    let machineId = String(payload.machine_id);
    
    let isModified = false;
    productIds.forEach(pid => {
        let cleanPid = String(pid);
        if (!cleanPid) return;
        let isDuplicate = mappings.some(m => String(m.product_id) === cleanPid && String(m.machine_id) === machineId);
        if (!isDuplicate) {
            mappings.push({ product_id: cleanPid, machine_id: machineId });
            isModified = true;
        }
    });
    
    if (isModified) {
        await firebase.database().ref('mappings').set(mappings);
        db.mappings = mappings;
        invalidateLocalCache();
    } else {
        throw new Error("รายการอะไหล่ที่เลือก ถูกจับคู่กับเครื่องจักรนี้อยู่แล้วทั้งหมด");
    }
}

async function executeDirectDeleteMapping(payload) {
    const snapshot = await firebase.database().ref('mappings').get();
    let mappings = ensureArray(snapshot.val());
    
    let pid = String(payload.product_id);
    let mid = String(payload.machine_id);
    mappings = mappings.filter(m => !(String(m.product_id) === pid && String(m.machine_id) === mid));
    
    await firebase.database().ref('mappings').set(mappings);
    db.mappings = mappings;
    invalidateLocalCache();
}

async function executeDirectSaveSettings(payload) {
    await firebase.database().ref('appData/settings').set(payload);
    db.settings = payload;
    invalidateLocalCache();
}

async function executeDirectAddPurchaseOrderDraft(payload) {
    const snapshot = await firebase.database().ref().get();
    const fbData = snapshot.val() || {};
    
    let products = ensureArray(fbData.appData?.products);
    let purchaseOrders = ensureArray(fbData.appData?.purchaseOrders);
    
    const productId = String(payload.productId).trim();
    const productName = String(payload.productName).trim();
    const orderedQty = parseFloat(payload.orderedQty) || 0;
    if (orderedQty <= 0) throw new Error("จำนวนที่สั่งต้องมากกว่า 0");
    
    const todayStr = new Date().toISOString().split('T')[0];
    let currentCost = 0;
    let currentSupplier = "";
    
    const product = products.find(p => String(p.id).trim() === productId);
    if (product) {
        currentCost = parseFloat(product.cost) || 0;
        currentSupplier = String(product.supplier || "").trim();
    }
    
    const newPoNumber = "PO-DRF-" + Date.now();
    const newPo = {
        poNumber: newPoNumber,
        prNumber: "",
        productId: productId,
        productName: productName,
        orderDate: todayStr,
        orderedQty: orderedQty,
        receivedQty: 0,
        lastReceivedDate: "",
        status: "เตรียมสั่ง",
        unitCost: currentCost,
        totalCost: orderedQty * currentCost,
        supplier: currentSupplier
    };
    
    purchaseOrders.push(newPo);
    await firebase.database().ref('appData/purchaseOrders').set(purchaseOrders);
    db.purchaseOrders = purchaseOrders;
    invalidateLocalCache();
    
    return newPo;
}

async function executeDirectEditPurchaseOrderDraft(payload) {
    const snapshot = await firebase.database().ref('appData/purchaseOrders').get();
    const purchaseOrders = ensureArray(snapshot.val());
    
    const poNumber = String(payload.poNumber).trim();
    const productId = String(payload.productId).trim();
    const index = purchaseOrders.findIndex(o => String(o.poNumber).trim() === poNumber && String(o.productId).trim() === productId);
    if (index === -1) throw new Error("ไม่พบรายการใบสั่งซื้อที่ต้องการแก้ไข");
    
    const orderedQty = parseFloat(payload.orderedQty) || 0;
    if (orderedQty <= 0) throw new Error("จำนวนที่สั่งต้องมากกว่า 0");
    
    purchaseOrders[index].orderedQty = orderedQty;
    purchaseOrders[index].totalCost = orderedQty * (parseFloat(purchaseOrders[index].unitCost) || 0);
    
    await firebase.database().ref('appData/purchaseOrders').set(purchaseOrders);
    db.purchaseOrders = purchaseOrders;
    invalidateLocalCache();
}

async function executeDirectDeletePurchaseOrderDraft(payload) {
    const snapshot = await firebase.database().ref('appData/purchaseOrders').get();
    let purchaseOrders = ensureArray(snapshot.val());
    
    const poNumber = String(payload.poNumber).trim();
    const productId = String(payload.productId).trim();
    purchaseOrders = purchaseOrders.filter(o => !(String(o.poNumber).trim() === poNumber && String(o.productId).trim() === productId));
    
    await firebase.database().ref('appData/purchaseOrders').set(purchaseOrders);
    db.purchaseOrders = purchaseOrders;
    invalidateLocalCache();
}

async function executeDirectDeletePurchaseOrderActive(payload) {
    const snapshot = await firebase.database().ref('appData/purchaseOrders').get();
    let purchaseOrders = ensureArray(snapshot.val());
    
    const poNumber = String(payload.poNumber).trim();
    purchaseOrders = purchaseOrders.filter(o => String(o.poNumber).trim() !== poNumber);
    
    await firebase.database().ref('appData/purchaseOrders').set(purchaseOrders);
    db.purchaseOrders = purchaseOrders;
    invalidateLocalCache();
}

async function executeDirectUpdatePurchaseOrderDraft(payload) {
    const snapshot = await firebase.database().ref().get();
    const fbData = snapshot.val() || {};
    
    let purchaseOrders = ensureArray(fbData.appData?.purchaseOrders);
    let products = ensureArray(fbData.appData?.products);
    
    const originalPoNumber = String(payload.originalPoNumber).trim();
    const newPoNumber = String(payload.newPoNumber || '').trim();
    const newPrNumber = String(payload.newPrNumber || '').trim();
    const orderedQty = parseFloat(payload.orderedQty) || 0;
    const unitCost = parseFloat(payload.unitCost) || 0;
    const status = String(payload.status || '').trim();
    const productId = String(payload.productId).trim();
    const newSupplier = String(payload.newSupplier || '').trim();
    const newUnit = String(payload.newUnit || '').trim();
    
    if (orderedQty <= 0) throw new Error("จำนวนที่สั่งต้องมากกว่า 0");
    
    const index = purchaseOrders.findIndex(o => String(o.poNumber).trim() === originalPoNumber);
    if (index === -1) throw new Error("ไม่พบรายการใบสั่งซื้อต้นฉบับ " + originalPoNumber);
    
    let currentStatus = String(purchaseOrders[index].status).trim();
    if (status) {
        currentStatus = status;
    } else if (newPoNumber && newPoNumber.indexOf("PO-DRF-") !== 0) {
        currentStatus = "สั่งแล้ว";
    }
    
    purchaseOrders[index] = {
        poNumber: newPoNumber || originalPoNumber,
        prNumber: newPrNumber || "PR-DRAFT",
        productId: productId,
        productName: purchaseOrders[index].productName,
        orderDate: purchaseOrders[index].orderDate,
        orderedQty: orderedQty,
        receivedQty: parseFloat(purchaseOrders[index].receivedQty) || 0,
        lastReceivedDate: purchaseOrders[index].lastReceivedDate || "",
        status: currentStatus,
        unitCost: unitCost,
        totalCost: orderedQty * unitCost,
        supplier: newSupplier
    };

    // Update master product record if found
    const product = products.find(p => String(p.id).trim() === productId);
    if (product) {
        product.cost = unitCost;
        product.supplier = newSupplier;
        if (newUnit) {
            product.unit = newUnit;
        }

        // Auto-pricing update based on new cost
        let factorA = 1.05;
        let factorB = 1.10;
        let factorC = 1.20;
        if (unitCost >= 10000) { factorA = 1.02; factorB = 1.05; factorC = 1.10; }
        else if (unitCost >= 5000) { factorA = 1.03; factorB = 1.07; factorC = 1.15; }
        
        product.price_a = Math.ceil(unitCost * factorA);
        product.price_b = Math.ceil(unitCost * factorB);
        product.price_c = Math.ceil(unitCost * factorC);
    }
    
    const updates = {};
    updates["appData/purchaseOrders"] = purchaseOrders;
    updates["appData/products"] = products;
    
    await firebase.database().ref().update(updates);
    
    db.purchaseOrders = purchaseOrders;
    db.products = products;
    invalidateLocalCache();
}

async function executeDirectReceivePurchaseGoods(payload) {
    const snapshot = await firebase.database().ref().get();
    const fbData = snapshot.val() || {};
    
    let purchaseOrders = ensureArray(fbData.appData?.purchaseOrders);
    let products = ensureArray(fbData.appData?.products);
    let lots = ensureArray(fbData.lots);
    let transactions = ensureArray(fbData.transactions);
    
    const poNum = String(payload.poNumber).trim();
    const poIndex = purchaseOrders.findIndex(o => String(o.poNumber).trim() === poNum);
    if (poIndex === -1) throw new Error("ไม่พบรายการใบสั่งซื้อ " + poNum);
    
    const po = purchaseOrders[poIndex];
    const recAmt = parseFloat(payload.receivedAmount) || 0;
    const currentReceived = parseFloat(po.receivedQty) || 0;
    const ordered = parseFloat(po.orderedQty) || 0;
    
    const newReceived = currentReceived + recAmt;
    if (newReceived > ordered) {
        throw new Error("จำนวนรับเข้าสะสม (" + newReceived + ") เกินจำนวนที่สั่งซื้อไว้ (" + ordered + ")");
    }
    
    const nowStr = new Date().toISOString().split('T')[0];
    po.receivedQty = newReceived;
    po.lastReceivedDate = nowStr;
    po.status = (newReceived === ordered) ? "ได้รับครบ" : "ค้างส่ง";
    
    const lotId = "LOT-PO-" + poNum + "-" + Date.now();
    const lotPrices = {
        price_a: 0,
        price_b: 0,
        price_c: 0
    };
    
    const product = products.find(p => String(p.id).trim() === String(po.productId).trim());
    if (product) {
        product.stock_qty = (parseFloat(product.stock_qty) || 0) + recAmt;
        product.cost = parseFloat(po.unitCost) || 0;
        
        // Auto prices
        const cost = parseFloat(po.unitCost) || 0;
        let factorA = 1.05;
        let factorB = 1.10;
        let factorC = 1.20;
        if (cost >= 10000) { factorA = 1.02; factorB = 1.05; factorC = 1.10; }
        else if (cost >= 5000) { factorA = 1.03; factorB = 1.07; factorC = 1.15; }
        
        product.price_a = Math.ceil(cost * factorA);
        product.price_b = Math.ceil(cost * factorB);
        product.price_c = Math.ceil(cost * factorC);
        
        lotPrices.price_a = product.price_a;
        lotPrices.price_b = product.price_b;
        lotPrices.price_c = product.price_c;
    }
    
    lots.push({
        lot_id: lotId,
        product_id: po.productId,
        cost: parseFloat(po.unitCost) || 0,
        price_a: lotPrices.price_a,
        price_b: lotPrices.price_b,
        price_c: lotPrices.price_c,
        initial_qty: recAmt,
        remaining_qty: recAmt,
        created_at: getFormattedDateTimeString(),
        note: "รับสินค้าจาก PO " + poNum
    });
    
    let lastTxId = 0;
    if (transactions.length > 0) {
        const lastTx = transactions[transactions.length - 1];
        lastTxId = parseInt(String(lastTx.id).replace("TX-", "")) || 0;
    }
    const nextTxId = "TX-" + String(lastTxId + 1).padStart(6, '0');
    
    transactions.push({
        id: nextTxId,
        requester: payload.requester || "สโตร์ (รับเข้า)",
        department: payload.department || "สโตร์ (รับเข้า)",
        machine_id: "PO_RECEIVE",
        serial_number: "",
        total_price: 0,
        note: "รับสินค้าจาก PO " + poNum,
        created_at: getFormattedDateTimeString(),
        status: "Restock",
        items: [{
            lot_id: lotId,
            product_id: po.productId,
            qty: recAmt,
            cost: parseFloat(po.unitCost) || 0,
            price: 0
        }]
    });
    
    const updates = {};
    updates["appData/purchaseOrders"] = purchaseOrders;
    updates["appData/products"] = products;
    updates["lots"] = lots;
    updates["transactions"] = transactions;
    await firebase.database().ref().update(updates);
    transactionsCache = null; // Invalidate cache
    
    db.purchaseOrders = purchaseOrders;
    invalidateLocalCache();
    db.products = products;
    db.lots = lots;
    db.transactions = transactions;
    
    return { status: "success", poNumber: poNum };
}

function ensureArray(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'object') {
        return Object.keys(val).sort((a, b) => Number(a) - Number(b)).map(key => val[key]);
    }
    return [];
}

function invalidateLocalCache() {
    try {
        localStorage.removeItem('spareparts_cache_v1');
        console.log("[Firebase Bypass] LocalStorage cache invalidated.");
    } catch (e) {
        console.error("Failed to clear localStorage cache: ", e);
    }
}

// Global Fetch Interceptor to bypass Apps Script
const originalFetch = window.fetch;
window.fetch = async function (url, options) {
    if (typeof url === 'string' && url.includes(API_URL) && options && options.method === 'POST') {
        try {
            const body = JSON.parse(options.body);
            const action = body.action;
            const payload = body.payload;
            
            if (BYPASS_ACTIONS.includes(action)) {
                // If there's an image/file upload, let it go to Apps Script
                if (action === 'editProduct' && payload && payload.imageBase64) {
                    console.log(`[Firebase Bypass] editProduct has image, letting Apps Script handle it.`);
                } else if (action === 'editMachine' && payload && payload.imageBase64) {
                    console.log(`[Firebase Bypass] editMachine has image, letting Apps Script handle it.`);
                } else if (action === 'editManual' && payload && payload.file_url && payload.file_url.indexOf("data:") === 0) {
                    console.log(`[Firebase Bypass] editManual has file payload, letting Apps Script handle it.`);
                } else {
                    console.log(`[Firebase Bypass] Intercepting action: ${action}`);
                    const result = await handleActionDirectlyOnFirebase(action, payload);
                    return new Response(JSON.stringify(result), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }
        } catch (e) {
            console.error("Fetch interceptor parse error: ", e);
        }
    }
    return originalFetch.apply(this, arguments);
};

console.log("[Firebase Bypass] Interceptor activated successfully.");
