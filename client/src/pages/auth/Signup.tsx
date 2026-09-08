import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Zap,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Building,
  Upload,
  Droplets,
  Lightbulb,
  Sliders,
  ShieldCheck
} from 'lucide-react';

interface SignupProps {
  onNavigate: (path: string) => void;
}

export const Signup: React.FC<SignupProps> = ({ onNavigate }) => {
  const { register } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Step 1: User Account
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });

  // Step 2: Society Details
  const [societyData, setSocietyData] = useState({
    societyName: '',
    location: '',
    city: 'Bengaluru',
    apartments: '120',
    buildings: '3',
    floors: '10'
  });

  // Step 3: Common Facilities
  const facilityOptions = [
    { id: 'Water Pumps', label: 'Water Pumps (Hydro-pneumatic & Booster)', icon: Droplets },
    { id: 'Elevators', label: 'Passenger & Service Elevators', icon: Building },
    { id: 'Common Lighting', label: 'Common Area & Basement Lighting', icon: Lightbulb },
    { id: 'Clubhouse', label: 'Clubhouse & Multipurpose Hall', icon: Zap },
    { id: 'Swimming Pool', label: 'Swimming Pool Filtration', icon: Sliders },
    { id: 'Gym', label: 'Gymnasium & Aerobic Center', icon: Zap },
    { id: 'Parking', label: 'Basement & Stilt Parking', icon: Building },
    { id: 'STP & Aeration', label: 'Sewage Treatment Plant (STP)', icon: ShieldCheck }
  ];
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([
    'Water Pumps',
    'Common Lighting',
    'Elevators'
  ]);

  // Step 4: First bill upload or skip
  const [firstBillOption, setFirstBillOption] = useState<'upload_now' | 'enter_manually' | 'later'>('later');

  const toggleFacility = (id: string) => {
    if (selectedFacilities.includes(id)) {
      setSelectedFacilities(selectedFacilities.filter(f => f !== id));
    } else {
      setSelectedFacilities([...selectedFacilities, id]);
    }
  };

  const handleNextStep = () => {
    setErrorMessage('');
    if (currentStep === 1) {
      if (!userData.name || !userData.email || !userData.password) {
        setErrorMessage('Name, email, and password are required.');
        return;
      }
      if (userData.password.length < 6) {
        setErrorMessage('Password must be at least 6 characters.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!societyData.societyName) {
        setErrorMessage('Society name is required.');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (selectedFacilities.length === 0) {
        setErrorMessage('Please select at least one common facility.');
        return;
      }
      setCurrentStep(4);
    }
  };

  const handleFinishRegistration = async () => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      await register({
        ...userData,
        ...societyData,
        facilities: selectedFacilities
      });
      onNavigate('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please review your entries.');
    } finally {
      setIsLoading(false);
    }
  };

  const progressPercentages = {
    1: 25,
    2: 50,
    3: 75,
    4: 100
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-6">
        {/* Top Header */}
        <div className="text-center">
          <div
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-2 cursor-pointer mb-3"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              Watt<span className="text-emerald-600">Wise</span>
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Society Registration & 3-Month Pilot Setup
          </h2>
        </div>

        {/* Progress Bar with Step Indicator */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-emerald-700">Step {currentStep} of 4</span>
            <span className="text-slate-600">
              Society Setup {progressPercentages[currentStep as keyof typeof progressPercentages]}% complete
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercentages[currentStep as keyof typeof progressPercentages]}%` }}
            />
          </div>
        </div>

        {/* Step Content Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {errorMessage}
            </div>
          )}

          {/* STEP 1: Account Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Step 1: Society Administrator Account</h3>
                <p className="text-xs text-slate-500 mt-0.5">Enter your official RWA email and login credentials.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  value={userData.name}
                  onChange={e => setUserData({ ...userData, name: e.target.value })}
                  placeholder="e.g. Rajesh Kumar (President / Treasurer)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Committee / Official Email *</label>
                <input
                  type="email"
                  required
                  value={userData.email}
                  onChange={e => setUserData({ ...userData, email: e.target.value })}
                  placeholder="president@society.com"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={userData.password}
                    onChange={e => setUserData({ ...userData, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={userData.phone}
                    onChange={e => setUserData({ ...userData, phone: e.target.value })}
                    placeholder="+91 98450 00000"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Society Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Step 2: Apartment Society Profile</h3>
                <p className="text-xs text-slate-500 mt-0.5">Basic layout metrics help establish accurate per-apartment energy benchmarks.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Apartment Society Name *</label>
                <input
                  type="text"
                  required
                  value={societyData.societyName}
                  onChange={e => setSocietyData({ ...societyData, societyName: e.target.value })}
                  placeholder="e.g. Green Valley Residency"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Locality / Area *</label>
                  <input
                    type="text"
                    required
                    value={societyData.location}
                    onChange={e => setSocietyData({ ...societyData, location: e.target.value })}
                    placeholder="e.g. Bellandur, Outer Ring Rd"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={societyData.city}
                    onChange={e => setSocietyData({ ...societyData, city: e.target.value })}
                    placeholder="Bengaluru"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Apartments</label>
                  <input
                    type="number"
                    min="1"
                    value={societyData.apartments}
                    onChange={e => setSocietyData({ ...societyData, apartments: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Buildings</label>
                  <input
                    type="number"
                    min="1"
                    value={societyData.buildings}
                    onChange={e => setSocietyData({ ...societyData, buildings: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Floors</label>
                  <input
                    type="number"
                    min="1"
                    value={societyData.floors}
                    onChange={e => setSocietyData({ ...societyData, floors: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Facilities Checklist */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Step 3: Select Common Facilities</h3>
                <p className="text-xs text-slate-500 mt-0.5">Select common loads present in your community for targeted analytics.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {facilityOptions.map(f => {
                  const isChecked = selectedFacilities.includes(f.id);
                  const Icon = f.icon;
                  return (
                    <div
                      key={f.id}
                      onClick={() => toggleFacility(f.id)}
                      className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-50/60 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isChecked ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <span className={`text-xs font-semibold ${isChecked ? 'text-emerald-950' : 'text-slate-800'}`}>
                          {f.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: First Bill Upload or Finish */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Society Setup 75% Complete!
                </p>
                <p className="text-emerald-800">
                  Your 3-Month Free Pilot is ready to be initiated. To begin unlocking consumption insights, you can upload your first electricity bill now or proceed directly to your dashboard.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">Initial Bill Ingestion Choice</label>

                <div
                  onClick={() => setFirstBillOption('later')}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer ${
                    firstBillOption === 'later' ? 'border-emerald-500 bg-emerald-50/40' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800">Go directly to Dashboard</p>
                    <p className="text-[11px] text-slate-500">I will upload bills from the Bill Management module later.</p>
                  </div>
                  {firstBillOption === 'later' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>

                <div
                  onClick={() => setFirstBillOption('upload_now')}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer ${
                    firstBillOption === 'upload_now' ? 'border-emerald-500 bg-emerald-50/40' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800">Upload First Bill after entering portal</p>
                    <p className="text-[11px] text-slate-500">Redirects straight to the PDF / CSV upload dropzone.</p>
                  </div>
                  {firstBillOption === 'upload_now' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(currentStep - 1)}
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                Already registered? Sign In
              </button>
            )}

            {currentStep < 4 ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleNextStep}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="md"
                isLoading={isLoading}
                onClick={handleFinishRegistration}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Complete Setup & Launch Pilot
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
