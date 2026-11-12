import React, { useState } from 'react';
import {
  Trash2
} from 'lucide-react';
import { formatNepaliCurrency } from '../../utils/nepaliDate';
import { useLanguage } from '../../context/LanguageContext';

export default function SettingsManager({
  tenant,
  units = [],
  users = [],
  currentUser,
  onRefresh,
  initialTab = 'units'
}) {
  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState(initialTab || 'units');

  React.useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);
  const [unitName, setUnitName] = useState('');
  const [unitNepali, setUnitNepali] = useState('');
  const [unitCode, setUnitCode] = useState('');

  // User Form
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userPassword, setUserPassword] = useState('Password123');
  const [userRole, setUserRole] = useState('User');

  // Renewal Modal
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [renewMonths, setRenewMonths] = useState(12);
  const [renewAmount, setRenewAmount] = useState(35000);
  const [loading, setLoading] = useState(false);

  const handleAddUnit = async (e) => {
    e.preventDefault();
    if (!unitName) return;

    try {
      const res = await fetch('/api/Unit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: unitName, nameInNepali: unitNepali, code: unitCode })
      });
      if (res.ok) {
        setUnitName('');
        setUnitNepali('');
        setUnitCode('');
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUnit = async (id) => {
    const confirmMsg = lang === 'en' ? 'Are you sure you want to delete this unit?' : 'के तपाईं यो एकाइ मेटाउन निश्चित हुनुहुन्छ?';
    if (!confirm(confirmMsg)) return;
    try {
      const res = await fetch(`/api/Unit/${id}`, { method: 'DELETE' });
      if (res.ok && onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!userEmail || !userName) return;

    try {
      const res = await fetch('/api/UserManager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          name: userName,
          password: userPassword,
          roles: [userRole],
          tenantId: tenant?.id || 1
        })
      });

      if (res.ok) {
        setUserModalOpen(false);
        setUserEmail('');
        setUserName('');
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      const res = await fetch('/api/UserManager/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok && onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRenewSubscription = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/Tenant/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant?.id,
          extendedMonths: Number(renewMonths),
          amountPaid: Number(renewAmount),
          remarks: lang === 'en' ? `Subscription renewal (${renewMonths} months)` : `सदस्यता नवीकरण (${renewMonths} महिना)`
        })
      });

      if (res.ok) {
        setRenewModalOpen(false);
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isExpired = tenant?.expirationDateTimeUtms && tenant.expirationDateTimeUtms < Date.now();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-slate-800 leading-tight">
            {t('settingsTitle')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t('settingsSubtitle')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('units')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
            activeTab === 'units' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t('tabUnits')}
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
            activeTab === 'users' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t('tabUsers')}
        </button>
        <button
          onClick={() => setActiveTab('tenant')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
            activeTab === 'tenant' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t('tabTenant')}
        </button>
      </div>

      {/* Tab 1: Units Management */}
      {activeTab === 'units' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs h-fit">
            <h3 className="font-bold text-sm text-slate-800 mb-3">{lang === 'en' ? 'Add Unit' : 'नयाँ एकाइ थप्नुहोस्'}</h3>
            <form onSubmit={handleAddUnit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{lang === 'en' ? 'English Name' : 'अंग्रेजी नाम'}</label>
                <input
                  type="text"
                  placeholder="e.g. Litre"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{lang === 'en' ? 'Nepali Name' : 'नेपाली नाम'}</label>
                <input
                  type="text"
                  placeholder="उदा: लिटर"
                  value={unitNepali}
                  onChange={(e) => setUnitNepali(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('code')}</label>
                <input
                  type="text"
                  placeholder="e.g. L"
                  value={unitCode}
                  onChange={(e) => setUnitCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none uppercase font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/20"
              >
                {t('save')}
              </button>
            </form>
          </div>

          <div className="md:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">{lang === 'en' ? 'English Name' : 'अंग्रेजी नाम'}</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Nepali Name' : 'नेपाली नाम'}</th>
                  <th className="py-3 px-4">{t('code')}</th>
                  <th className="py-3 px-4 text-center">{t('action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {units.filter(u => !u.isDeleted).map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-4 font-bold text-slate-800">{u.name}</td>
                    <td className="py-2.5 px-4 text-slate-700">{u.nameInNepali || '-'}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">{u.code}</td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => handleDeleteUnit(u.id)}
                        className="p-1 rounded text-rose-500 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Users Management */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800">{lang === 'en' ? 'System Users' : 'प्रयोगकर्ता खाता सूची'}</h3>
            <button
              onClick={() => setUserModalOpen(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition"
            >
              {lang === 'en' ? 'Add User' : 'नयाँ प्रयोगकर्ता थप्नुहोस्'}
            </button>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b">
              <tr>
                <th className="py-3 px-4">{lang === 'en' ? 'Name' : 'नाम'}</th>
                <th className="py-3 px-4">{lang === 'en' ? 'Email' : 'इमेल'}</th>
                <th className="py-3 px-4">{lang === 'en' ? 'Role' : 'भूमिका'}</th>
                <th className="py-3 px-4 text-center">{t('status')}</th>
                <th className="py-3 px-4 text-center">{t('action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-bold text-slate-800">{u.name}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-600">{u.email}</td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                      {Array.isArray(u.roles) ? u.roles.join(', ') : u.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {u.isActive ? (lang === 'en' ? 'Active' : 'सक्रिय') : (lang === 'en' ? 'Inactive' : 'निष्क्रिय')}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <button
                      onClick={() => handleToggleUserStatus(u.id)}
                      className="text-xs text-slate-500 hover:text-slate-800 underline font-semibold"
                    >
                      {u.isActive ? (lang === 'en' ? 'Deactivate' : 'निष्क्रिय बनाउनुहोस्') : (lang === 'en' ? 'Activate' : 'सक्रिय बनाउनुहोस्')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Tenant & Subscription Details */}
      {activeTab === 'tenant' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6 max-w-2xl">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">{lang === 'en' ? 'Dairy Cooperative Profile' : 'डेरी सहकारी संस्था विवरण'}</h3>
              <p className="text-xs text-slate-500">{lang === 'en' ? 'Institutional details, address, and ERP subscription status' : 'संस्थागत नाम, कार्यक्षेत्र, तथा सफ्टवेयर सदस्यता स्थिति'}</p>
            </div>
            <button
              onClick={() => setRenewModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/20"
            >
              {lang === 'en' ? 'Renew Subscription' : 'सदस्यता नवीकरण गर्नुहोस्'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">{lang === 'en' ? 'Organization Name:' : 'संस्थाको नाम:'}</span>
              <strong className="text-slate-800 text-sm">{tenant?.organizationName}</strong>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">{lang === 'en' ? 'Host Subdomain:' : 'संस्थागत कोड / Host:'}</span>
              <code className="text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded">{tenant?.host}</code>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">{t('address')}:</span>
              <span className="text-slate-700 font-semibold">{tenant?.address}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">{lang === 'en' ? 'Timezone:' : 'टाइमजोन:'}</span>
              <span className="text-slate-700 font-mono">{tenant?.timezone}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">{lang === 'en' ? 'Subscription Expiry Date:' : 'सदस्यता समाप्त हुने मिति:'}</span>
              <strong className={`text-sm ${isExpired ? 'text-rose-600' : 'text-emerald-700'}`}>
                {tenant?.expirationDateTimeUtms ? new Date(tenant.expirationDateTimeUtms).toLocaleDateString(lang === 'en' ? 'en-US' : 'ne-NP') : (lang === 'en' ? 'Pending' : 'अनिश्चित')}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">{lang === 'en' ? 'Annual Subscription Fee:' : 'वार्षिक शुल्क:'}</span>
              <span className="text-slate-800 font-bold">{formatNepaliCurrency(tenant?.subscriptionAmount || 35000)}</span>
            </div>
          </div>
        </div>
      )}

      {/* User Create Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">{lang === 'en' ? 'Create User Account' : 'नयाँ प्रयोगकर्ता खाता सिर्जना'}</h3>
              <button onClick={() => setUserModalOpen(false)} className="p-1 rounded-lg hover:bg-white/20 transition">
                &times;
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{lang === 'en' ? 'Full Name' : 'पूरा नाम'}</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{lang === 'en' ? 'Email' : 'इमेल'}</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{lang === 'en' ? 'Initial Password' : 'प्रारम्भिक पासवर्ड'}</label>
                <input
                  type="text"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{lang === 'en' ? 'Role' : 'भूमिका'}</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                >
                  <option value="User">{lang === 'en' ? 'Counter Staff' : 'काउन्टर कर्मचारी'}</option>
                  <option value="Admin">{lang === 'en' ? 'Dairy Manager' : 'डेरी व्यवस्थापक'}</option>
                  <option value="SuperAdmin">{lang === 'en' ? 'Software Administrator' : 'सफ्टवेयर प्रशासक'}</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/20"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscription Renewal Modal */}
      {renewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">{lang === 'en' ? 'Renew Subscription' : 'सफ्टवेयर सदस्यता नवीकरण'}</h3>
              <button onClick={() => setRenewModalOpen(false)} className="p-1 rounded-lg hover:bg-white/20 transition">
                &times;
              </button>
            </div>
            <form onSubmit={handleRenewSubscription} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{lang === 'en' ? 'Renewal Period' : 'थप नवीकरण अवधि'}</label>
                <select
                  value={renewMonths}
                  onChange={(e) => {
                    setRenewMonths(e.target.value);
                    setRenewAmount(Number(e.target.value) === 12 ? 35000 : 20000);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                >
                  <option value="12">{lang === 'en' ? '1 Year - Rs. 35,000' : '१ वर्ष - रु. ३५,०००'}</option>
                  <option value="6">{lang === 'en' ? '6 Months - Rs. 20,000' : '६ महिना - रु. २०,०००'}</option>
                  <option value="24">{lang === 'en' ? '2 Years - Rs. 65,000' : '२ वर्ष - रु. ६५,०००'}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('paidAmount')}</label>
                <input
                  type="number"
                  value={renewAmount}
                  onChange={(e) => setRenewAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none font-bold text-emerald-800"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setRenewModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/20"
                >
                  {loading ? (lang === 'en' ? 'Renewing...' : 'नवीकरण हुँदैछ...') : (lang === 'en' ? 'Confirm Renewal' : 'नवीकरण पुष्टि गर्नुहोस्')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
