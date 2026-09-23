import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./Firebase"; 

export default function App() {
  const [amount, setAmount] = useState(500000);
  const [months, setMonths] = useState(12);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("accounts");

  // Безопасный реактивный слушатель профиля с обработкой ошибок доступа
  useEffect(() => {
    let unsubscribeFirestore = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        setIsProfileLoading(true);
        const docRef = doc(db, "users", currentUser.uid);

        unsubscribeFirestore = onSnapshot(
          docRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setUserData(docSnap.data());
            } else {
              // Graceful degradation: документ создается асинхронно
              setUserData({
                email: currentUser.email,
                balance: 0,
                status: "Инициализация профиля...",
                isPending: true
              });
            }
            setIsProfileLoading(false);
          },
          (error) => {
            console.error("[SECURITY AUDIT] Ошибка доступа к Firestore:", error);
            if (error.code === "permission-denied") {
              alert("ПРЕДУПРЕЖДЕНИЕ БЕЗОПАСНОСТИ: Доступ к профилю отклонён политикой разграничения прав (Security Rules).");
            }
            setIsProfileLoading(false);
          }
        );
      } else {
        setUserData(null);
        setIsProfileLoading(false);
        setActiveTab("accounts");
        if (unsubscribeFirestore) unsubscribeFirestore();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (isLoginMode) {
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        setIsModalOpen(false);
        setEmail("");
        setPassword("");
      } catch (error) {
        alert("Ошибка аутентификации: Неверный логин или пароль.");
      }
    } else {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const uid = userCredential.user.uid;

        // Инициализируем запись строго в соответствии со схемой безопасности
        await setDoc(doc(db, "users", uid), {
          email: cleanEmail,
          balance: 0, // Правила базы гарантируют отклонение любого другого значения
          status: "Новый клиент",
          createdAt: new Date().toISOString()
        });

        setIsModalOpen(false);
        setEmail("");
        setPassword("");
      } catch (error) {
        if (error.code === "permission-denied") {
          alert("ОТКЛОНЕНО СИСТЕМОЙ БЕЗОПАСНОСТИ: Попытка нарушения схемы инициализации счёта.");
        } else {
          alert("Ошибка при регистрации: " + error.message);
        }
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const getRate = (m) => (m >= 24 ? 14.5 : m >= 12 ? 14.0 : 12.0);
  const rate = getRate(months);
  const profit = Math.round(amount * (rate / 100) * (months / 12));
  const formatNumber = (val) => new Intl.NumberFormat('ru-RU').format(val || 0);
  const getMonthsLabel = (m) => {
    if (m % 10 === 1 && m % 100 !== 11) return 'месяц';
    if ([2, 3, 4].includes(m % 10) && ![12, 13, 14].includes(m % 100)) return 'месяца';
    return 'месяцев';
  };

  const getTabClass = (tabName) => {
    const baseClass = "w-full text-left block px-4 py-3 text-sm font-bold uppercase rounded-sm transition-colors border ";
    return activeTab === tabName 
      ? baseClass + "bg-gov-accent/10 border-gov-accent text-gov-accent" 
      : baseClass + "border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50";
  };

  // ==========================================
  // РЕНДЕР 1: ЛИЧНЫЙ КАБИНЕТ
  // ==========================================
  if (user) {
    return (
      <div className="min-h-screen bg-gov-bg text-slate-100 flex font-sans">
        <aside className="w-64 bg-gov-surface border-r border-gov-border flex flex-col shrink-0">
          <div className="h-20 border-b border-gov-border flex items-center px-6">
            <div className="w-8 h-8 bg-slate-900 border border-gov-borderAccent flex items-center justify-center font-bold text-sm rounded-sm text-slate-100 mr-3">ЖБ</div>
            <span className="font-black uppercase tracking-tight text-white">Жетим Банк</span>
          </div>
          
          <nav className="flex-1 py-6 px-4 space-y-2">
            <button onClick={() => setActiveTab("accounts")} className={getTabClass("accounts")}>Счета и активы</button>
            <button onClick={() => setActiveTab("history")} className={getTabClass("history")}>История операций</button>
            <button onClick={() => setActiveTab("services")} className={getTabClass("services")}>Госуслуги</button>
            <button onClick={() => setActiveTab("documents")} className={getTabClass("documents")}>Документы</button>
          </nav>
          
          <div className="p-4 border-t border-gov-border">
            <button onClick={handleLogout} className="w-full border border-red-900/50 hover:bg-red-900/20 text-red-400 px-4 py-2 text-xs font-bold uppercase rounded-sm transition-colors">
              Завершить сеанс
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          <header className="h-20 border-b border-gov-border bg-gov-surface/50 flex items-center justify-between px-10">
            <div>
              <h2 className="text-xl font-bold uppercase text-white">Кабинет клиента</h2>
              <p className="text-xs text-slate-400">Узел №48-KZB-KZ • Защищенное соединение TLS 1.3</p>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-white uppercase">{user.email}</div>
              <div className="text-xs text-emerald-400 font-mono">Личность подтверждена 🏛</div>
            </div>
          </header>

          <div className="p-10 flex-1 overflow-y-auto">
            <div className="max-w-5xl">
              
              {activeTab === "accounts" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                  <div className="bg-gov-surface border border-gov-border p-6 rounded-sm shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gov-accent/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Государственный расчетный счет</span>
                        <span className="font-mono text-xs text-slate-500">№ 4081 7810 0 9999 0000123</span>
                      </div>
                      <span className="px-2 py-1 bg-emerald-900/30 border border-emerald-800 text-emerald-400 text-[10px] font-bold uppercase rounded-sm">
                        {isProfileLoading ? "Синхронизация..." : "Активен"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">Текущий баланс</span>
                      <div className="font-mono text-4xl font-bold text-white">
                        {isProfileLoading ? (
                          <span className="text-slate-500 animate-pulse">Загрузка...</span>
                        ) : (
                          `${formatNumber(userData?.balance)} ₽`
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gov-surface border border-gov-border p-6 rounded-sm shadow-lg">
                    <h3 className="text-sm font-bold uppercase text-white mb-4 border-b border-gov-border pb-2">Реквизиты и безопасность</h3>
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 block">Учетная запись (Email)</span>
                        <span className="font-mono text-sm text-slate-200">{user.email}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 block">Уровень доступа и статус</span>
                        <span className="text-sm font-bold text-blue-400 uppercase">
                          {isProfileLoading ? "Проверка подписи..." : (userData?.status || "Новый клиент")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "history" && (
                <div>
                  <h3 className="text-lg font-bold uppercase text-white mb-6">История транзакций</h3>
                  <div className="bg-gov-surface border border-gov-border rounded-sm">
                    <div className="flex justify-between items-center px-6 py-5 border-b border-gov-border">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-900/30 flex items-center justify-center text-emerald-400 border border-emerald-800">↓</div>
                        <div>
                          <div className="text-sm font-bold text-white">Пополнение с государственного фонда</div>
                          <div className="text-xs text-slate-500 font-mono mt-1">ID: TXN-9982-A4</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-base font-bold text-emerald-400">+ 15 000 ₽</div>
                        <div className="text-xs text-slate-500 mt-1">21 Сентября 2026, 14:30</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center px-6 py-5 border-b border-gov-border">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-gov-border">↑</div>
                        <div>
                          <div className="text-sm font-bold text-white">Оплата пошлины (Росреестр)</div>
                          <div className="text-xs text-slate-500 font-mono mt-1">ID: TXN-1029-B1</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-base font-bold text-white">- 1 250 ₽</div>
                        <div className="text-xs text-slate-500 mt-1">18 Сентября 2026, 09:15</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "services" && (
                <div>
                  <h3 className="text-lg font-bold uppercase text-white mb-6">Доступные государственные сервисы</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gov-surface border border-gov-border p-6 rounded-sm flex flex-col justify-between">
                      <div>
                        <div className="text-2xl mb-4">🏠</div>
                        <h4 className="font-bold text-white mb-2 leading-tight">Субсидия на жилье</h4>
                        <p className="text-xs text-slate-400 mb-6">Подача заявления на компенсацию части стоимости жилья по госпрограмме.</p>
                      </div>
                      <button className="w-full border border-gov-borderAccent hover:bg-gov-accent hover:border-gov-accent text-xs font-bold text-white py-2 rounded-sm transition-colors">Сформировать заявку</button>
                    </div>
                    <div className="bg-gov-surface border border-gov-border p-6 rounded-sm flex flex-col justify-between">
                      <div>
                        <div className="text-2xl mb-4">💼</div>
                        <h4 className="font-bold text-white mb-2 leading-tight">Регистрация ИП/Самозанятости</h4>
                        <p className="text-xs text-slate-400 mb-6">Мгновенное открытие специального налогового счета без визита в налоговую.</p>
                      </div>
                      <button className="w-full border border-gov-borderAccent hover:bg-gov-accent hover:border-gov-accent text-xs font-bold text-white py-2 rounded-sm transition-colors">Сформировать заявку</button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "documents" && (
                <div>
                  <h3 className="text-lg font-bold uppercase text-white mb-6">Официальные документы и выписки</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gov-surface border border-gov-border p-5 rounded-sm flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="text-slate-400">📄</div>
                        <div>
                          <div className="text-sm font-bold text-white">Договор банковского обслуживания</div>
                          <div className="text-[10px] text-slate-500 mt-1">PDF • 2.4 MB • Подписан ЭЦП</div>
                        </div>
                      </div>
                      <button className="text-xs font-bold text-gov-accent hover:text-white transition-colors">Скачать</button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // РЕНДЕР 2: ЛЕНДИНГ
  // ==========================================
  return (
    <div className="min-h-screen bg-gov-bg text-slate-100 flex flex-col font-sans relative">
      <div className="bg-[#060B10] border-b border-gov-border text-xs text-slate-400 py-1.5 tracking-wider">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <span className="flex items-center gap-2 uppercase font-semibold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Официальный финансовый орган государственной системы
          </span>
          <span className="hidden sm:inline">Служба поддержки: 8 (800) 500-00-00</span>
        </div>
      </div>

      <header className="bg-gov-surface border-b-2 border-gov-border sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-20 flex justify-between items-center">
          <a href="#" className="flex items-center gap-3 no-underline text-white">
            <div className="w-10 h-10 bg-slate-900 border border-gov-borderAccent flex items-center justify-center font-bold text-lg rounded-sm text-slate-100 shadow-inner">ЖБ</div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-tight leading-none text-white">Жетим Банк</h1>
              <span className="text-[11px] text-slate-400 uppercase tracking-widest block font-medium">Государственный банк</span>
            </div>
          </a>

          <nav className="hidden md:flex gap-8">
            <a href="#calc" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">Депозиты</a>
            <a href="#services" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">Программы</a>
            <a href="#regulation" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">Гарантии</a>
          </nav>

          <div className="flex gap-3">
            <button onClick={() => { setIsLoginMode(true); setIsModalOpen(true); }} className="border border-gov-borderAccent hover:border-slate-400 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-200 transition-colors rounded-sm">
              Войти
            </button>
            <button onClick={() => { setIsLoginMode(false); setIsModalOpen(true); }} className="bg-gov-accent hover:bg-gov-accentHover px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors rounded-sm shadow">
              Открыть счет
            </button>
          </div>
        </div>
      </header>

      {/* Модальное окно */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gov-surface border border-gov-border p-8 rounded-sm max-w-sm w-full shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
            <h2 className="text-xl font-bold uppercase text-white mb-2">{isLoginMode ? "Вход в систему" : "Регистрация в системе"}</h2>
            <p className="text-xs text-slate-400 mb-6">{isLoginMode ? "Авторизация в защищенном профиле" : "Создание защищенного профиля"}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gov-bg border border-gov-border text-white px-3 py-2 text-sm outline-none focus:border-gov-accent" required />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">Пароль</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-gov-bg border border-gov-border text-white px-3 py-2 text-sm outline-none focus:border-gov-accent" required minLength="6" />
              </div>
              <button type="submit" className="w-full bg-gov-accent hover:bg-gov-accentHover text-white py-3 text-xs font-bold uppercase tracking-wider mt-4 rounded-sm shadow">
                {isLoginMode ? "Войти в кабинет" : "Зарегистрировать счет"}
              </button>
            </form>
            <div className="mt-6 text-center border-t border-gov-border pt-4">
              <button type="button" onClick={() => setIsLoginMode(!isLoginMode)} className="text-xs text-slate-400 hover:text-white transition-colors">
                {isLoginMode ? "Нет аккаунта? Открыть счет" : "Уже есть счет? Войти"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Контент Лендинга */}
      <section id="calc" className="py-16 md:py-24 border-b border-gov-border bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-950/20 via-transparent to-transparent">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-7">
            <span className="inline-block text-xs font-bold uppercase tracking-wider text-blue-300 bg-blue-950 border border-blue-600 px-2.5 py-1 mb-6 rounded-sm">Государственный надзор</span>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-tight mb-6">Финансовый суверенитет и 100% возврат средств</h2>
            <p className="text-slate-400 text-base mb-8 max-w-xl leading-relaxed">«Жетим Банк» обеспечивает прямое размещение средств с фиксированной доходностью под государственные гарантии.</p>
            <div className="grid grid-cols-3 gap-6 pt-10 mt-10 border-t border-gov-border">
              <div><div className="font-mono text-2xl md:text-3xl font-bold text-white">100%</div><div className="text-xs text-slate-400 mt-1">Госкапитал</div></div>
              <div><div className="font-mono text-2xl md:text-3xl font-bold text-white">14.5%</div><div className="text-xs text-slate-400 mt-1">Макс. ставка</div></div>
              <div><div className="font-mono text-2xl md:text-3xl font-bold text-white">0 ₽</div><div className="text-xs text-slate-400 mt-1">Комиссия</div></div>
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="bg-gov-surface border border-gov-border p-6 rounded-sm shadow-2xl">
              <div className="border-b border-gov-border pb-4 mb-6"><h3 className="text-base font-bold uppercase tracking-wide text-white">Калькулятор «Госрезерв»</h3></div>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-baseline mb-2"><label className="text-xs font-semibold uppercase text-slate-400">Сумма вклада:</label><span className="font-mono text-lg font-bold text-white">{formatNumber(amount)} ₽</span></div>
                  <input type="range" min="50000" max="10000000" step="50000" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-none accent-blue-600 cursor-pointer" />
                </div>
                <div>
                  <div className="flex justify-between items-baseline mb-2"><label className="text-xs font-semibold uppercase text-slate-400">Срок:</label><span className="font-mono text-lg font-bold text-white">{months} {getMonthsLabel(months)}</span></div>
                  <input type="range" min="3" max="36" step="3" value={months} onChange={(e) => setMonths(Number(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-none accent-blue-600 cursor-pointer" />
                </div>
                <div className="bg-gov-card border border-gov-border p-4 grid grid-cols-2 gap-4">
                  <div><span className="block text-[11px] text-slate-400 uppercase tracking-wider">Ставка:</span><span className="font-mono text-xl font-bold text-emerald-400">{rate.toFixed(1)}%</span></div>
                  <div><span className="block text-[11px] text-slate-400 uppercase tracking-wider">Чистый доход:</span><span className="font-mono text-xl font-bold text-emerald-400">{formatNumber(profit)} ₽</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Футер */}
      <footer className="bg-[#060B10] py-14 text-sm text-slate-400 mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex justify-between text-xs text-slate-500">
          <span>© 2026 Жетим Банк. Все права защищены.</span>
          <span>Идентификатор узла: 0048-KZB-KZ</span>
        </div>
      </footer>
    </div>
  );
}