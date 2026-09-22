import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./Firebase"; 

export default function App() {
  const [amount, setAmount] = useState(500000);
  const [months, setMonths] = useState(12);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false); // Переключатель Вход/Регистрация
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Единая функция для отправки формы (и вход, и регистрация)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLoginMode) {
      // Логика ВХОДА
      try {
        await signInWithEmailAndPassword(auth, email, password);
        setIsModalOpen(false); // Закрываем окно
        setEmail("");
        setPassword("");
      } catch (error) {
        alert("Ошибка входа: проверьте email и пароль.");
      }
    } else {
      // Логика РЕГИСТРАЦИИ
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        await setDoc(doc(db, "users", uid), {
          email: email,
          balance: 0,
          status: "Новый клиент",
          createdAt: new Date()
        });

        alert("Счет успешно открыт!");
        setIsModalOpen(false); // Закрываем окно
        setEmail("");
        setPassword("");
      } catch (error) {
        alert("Ошибка при регистрации: " + error.message);
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const getRate = (m) => {
    if (m >= 24) return 14.5;
    if (m >= 12) return 14.0;
    return 12.0;
  };

  const rate = getRate(months);
  const profit = Math.round(amount * (rate / 100) * (months / 12));
  const formatNumber = (val) => new Intl.NumberFormat('ru-RU').format(val);

  const getMonthsLabel = (m) => {
    if (m % 10 === 1 && m % 100 !== 11) return 'месяц';
    if ([2, 3, 4].includes(m % 10) && ![12, 13, 14].includes(m % 100)) return 'месяца';
    return 'месяцев';
  };

  return (
    <div className="min-h-screen bg-gov-bg text-slate-100 flex flex-col font-sans relative">
      
      {/* 1. Верхняя полоса */}
      <div className="bg-[#060B10] border-b border-gov-border text-xs text-slate-400 py-1.5 tracking-wider">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <span className="flex items-center gap-2 uppercase font-semibold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Официальный финансовый орган государственной системы
          </span>
          <span className="hidden sm:inline">Служба поддержки: 8 (800) 500-00-00</span>
        </div>
      </div>

      {/* 2. Шапка */}
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

          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-mono text-emerald-400">{user.email}</span>
              <button onClick={handleLogout} className="border border-red-900/50 hover:bg-red-900/20 text-red-400 px-4 py-2 text-xs font-bold uppercase rounded-sm transition-colors">
                Выйти
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => { setIsLoginMode(true); setIsModalOpen(true); }} className="border border-gov-borderAccent hover:border-slate-400 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-200 transition-colors rounded-sm">
                Войти
              </button>
              <button onClick={() => { setIsLoginMode(false); setIsModalOpen(true); }} className="bg-gov-accent hover:bg-gov-accentHover px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors rounded-sm shadow">
                Открыть счет
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 3. Модальное окно (Вход / Регистрация) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gov-surface border border-gov-border p-8 rounded-sm max-w-sm w-full shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
            
            <h2 className="text-xl font-bold uppercase text-white mb-2">
              {isLoginMode ? "Вход в систему" : "Регистрация в системе"}
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              {isLoginMode ? "Авторизация в защищенном профиле" : "Создание защищенного профиля"}
            </p>

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

      {/* 4. Главный экран */}
      <section id="calc" className="py-16 md:py-24 border-b border-gov-border bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-950/20 via-transparent to-transparent">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-7">
            <span className="inline-block text-xs font-bold uppercase tracking-wider text-blue-300 bg-blue-950 border border-blue-600 px-2.5 py-1 mb-6 rounded-sm">Государственный надзор</span>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-tight mb-6">Финансовый суверенитет и 100% возврат средств</h2>
            <p className="text-slate-400 text-base mb-8 max-w-xl leading-relaxed">
              «Жетим Банк» обеспечивает прямое размещение средств с фиксированной доходностью под государственные гарантии.
            </p>
            <div className="grid grid-cols-3 gap-6 pt-10 mt-10 border-t border-gov-border">
              <div>
                <div className="font-mono text-2xl md:text-3xl font-bold text-white">100%</div>
                <div className="text-xs text-slate-400 mt-1">Госкапитал</div>
              </div>
              <div>
                <div className="font-mono text-2xl md:text-3xl font-bold text-white">14.5%</div>
                <div className="text-xs text-slate-400 mt-1">Макс. ставка</div>
              </div>
              <div>
                <div className="font-mono text-2xl md:text-3xl font-bold text-white">0 ₽</div>
                <div className="text-xs text-slate-400 mt-1">Комиссия за счет</div>
              </div>
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="bg-gov-surface border border-gov-border p-6 rounded-sm shadow-2xl">
              <div className="border-b border-gov-border pb-4 mb-6">
                <h3 className="text-base font-bold uppercase tracking-wide text-white">Калькулятор «Госрезерв»</h3>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <label className="text-xs font-semibold uppercase text-slate-400">Сумма вклада:</label>
                    <span className="font-mono text-lg font-bold text-white">{formatNumber(amount)} ₽</span>
                  </div>
                  <input type="range" min="50000" max="10000000" step="50000" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-none accent-blue-600 cursor-pointer" />
                </div>

                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <label className="text-xs font-semibold uppercase text-slate-400">Срок:</label>
                    <span className="font-mono text-lg font-bold text-white">{months} {getMonthsLabel(months)}</span>
                  </div>
                  <input type="range" min="3" max="36" step="3" value={months} onChange={(e) => setMonths(Number(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-none accent-blue-600 cursor-pointer" />
                </div>

                <div className="bg-gov-card border border-gov-border p-4 grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[11px] text-slate-400 uppercase tracking-wider">Ставка:</span>
                    <span className="font-mono text-xl font-bold text-emerald-400">{rate.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 uppercase tracking-wider">Чистый доход:</span>
                    <span className="font-mono text-xl font-bold text-emerald-400">{formatNumber(profit)} ₽</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Услуги */}
      <section className="py-20 border-b border-gov-border" id="services">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-12">
            <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-2">Государственные программы</h3>
            <p className="text-sm text-slate-400">Прямое участие в национальных расчетных системах</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gov-surface border border-gov-border hover:border-gov-borderAccent p-8 rounded-sm flex flex-col justify-between transition-colors">
              <div>
                <span className="font-mono text-xs font-bold text-blue-500 mb-3 block">ПРОГРАММА / 01</span>
                <h4 className="text-lg font-bold mb-3 text-white">Зарплатный счет «Казначей»</h4>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                  Прямой доступ к государственным фондам, мгновенное зачисление выплат без посредников и льготный овердрафт под 0%.
                </p>
              </div>
            </div>
            <div className="bg-gov-surface border border-gov-border hover:border-gov-borderAccent p-8 rounded-sm flex flex-col justify-between transition-colors">
              <div>
                <span className="font-mono text-xs font-bold text-blue-500 mb-3 block">ПРОГРАММА / 02</span>
                <h4 className="text-lg font-bold mb-3 text-white">Специальный вклад «Наследие»</h4>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                  Долгосрочный безотзывный депозит под максимальный гарантированный процент с защитой от инфляционных колебаний.
                </p>
              </div>
            </div>
            <div className="bg-gov-surface border border-gov-border hover:border-gov-borderAccent p-8 rounded-sm flex flex-col justify-between transition-colors">
              <div>
                <span className="font-mono text-xs font-bold text-blue-500 mb-3 block">ПРОГРАММА / 03</span>
                <h4 className="text-lg font-bold mb-3 text-white">Льготное целевое кредитование</h4>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                  Субсидированные займы на приобретение жилья и развитие частного предпринимательства со сниженной процентной ставкой.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Регуляция */}
      <section className="py-14 bg-[#0C1520] border-b border-gov-border" id="regulation">
        <div className="max-w-6xl mx-auto px-6">
          <div className="border border-gov-border bg-gov-surface p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 bg-gov-card border border-gov-borderAccent flex items-center justify-center text-3xl shrink-0">🏛</div>
            <div>
              <h4 className="text-base font-bold uppercase tracking-wide text-white mb-2">Правовой статус и гарантия сохранности</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                «Жетим Банк» действует на основании специального государственного регламента. Все обязательства обеспечены золотовалютными резервами казначейства. Деятельность контролируется Главным финансовым надзором.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Футер */}
      <footer className="bg-[#060B10] py-14 text-sm text-slate-400 mt-auto" id="footer">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between text-xs text-slate-500">
          <span>© 2026 Жетим Банк. Все права защищены.</span>
          <span>Идентификатор узла: 0048-KZB-KZ</span>
        </div>
      </footer>

    </div>
  );
}