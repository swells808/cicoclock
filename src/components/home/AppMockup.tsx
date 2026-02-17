import React from 'react';
import { Camera, MapPin, CheckCircle, Clock, User, Bell } from 'lucide-react';

interface AppMockupProps {
  variant: 'primary' | 'secondary';
}

const AppMockup: React.FC<AppMockupProps> = ({ variant }) => {
  const isPrimary = variant === 'primary';
  
  return (
    <div className={`w-full h-full rounded-[3rem] border-[8px] overflow-hidden bg-white flex flex-col relative ${isPrimary ? 'border-slate-900' : 'border-slate-800 bg-slate-50'}`}>
      {/* Notch */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-7 bg-slate-900 rounded-b-xl z-20"></div>

      {/* Status Bar Area */}
      <div className={`h-12 w-full flex items-center justify-between px-6 pt-2 ${isPrimary ? 'bg-cico-blue text-white' : 'bg-slate-800 text-slate-400'}`}>
        <span className="text-xs font-medium">9:41</span>
        <div className="flex gap-1">
            <div className="w-4 h-2 rounded-sm border border-current"></div>
            <div className="w-0.5 h-2 bg-current"></div>
        </div>
      </div>

      {/* App Header */}
      <div className={`p-6 pb-8 rounded-b-3xl shadow-sm z-10 ${isPrimary ? 'bg-cico-blue text-white' : 'bg-slate-800 text-white'}`}>
        <div className="flex justify-between items-center mb-6 mt-2">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <User size={20} />
                </div>
                <div>
                    <div className="text-xs opacity-80">Welcome back,</div>
                    <div className="font-semibold text-lg">Sarah Connor</div>
                </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Bell size={20} />
            </div>
        </div>

        {/* Clock In Status Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <div className="flex justify-between items-start mb-2">
                <span className="text-sm opacity-90">Current Status</span>
                <span className="bg-green-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Active</span>
            </div>
            <div className="text-3xl font-bold mb-1">08:42 <span className="text-sm font-normal opacity-70">AM</span></div>
            <div className="text-xs opacity-70">Clocked in at 8:00 AM</div>
        </div>
      </div>

      {/* App Content */}
      <div className="flex-1 bg-slate-50 p-6 overflow-hidden relative">
        <h3 className="font-bold text-slate-800 mb-4">Quick Actions</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center gap-2 hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-1">
                    <Clock size={20} />
                </div>
                <span className="text-xs font-medium text-slate-600">Break</span>
             </div>
             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center gap-2 hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center mb-1">
                    <MapPin size={20} />
                </div>
                <span className="text-xs font-medium text-slate-600">Location</span>
             </div>
        </div>

        <h3 className="font-bold text-slate-800 mb-4">Recent Activity</h3>
        <div className="space-y-3">
            {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${i === 1 ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                        {i === 1 ? <CheckCircle size={18} /> : <Camera size={18} />}
                    </div>
                    <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-800">{i === 1 ? 'Clocked In' : 'Photo Verified'}</div>
                        <div className="text-xs text-slate-500">San Francisco HQ</div>
                    </div>
                    <div className="text-xs font-medium text-slate-400">
                        {8 + i}:00 AM
                    </div>
                </div>
            ))}
        </div>
        
        {/* Fade out bottom */}
        <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none"></div>
      </div>

      {/* Bottom Nav */}
      <div className="h-16 bg-white border-t border-slate-100 flex items-center justify-around px-2 pb-2">
         {['Home', 'Logs', 'Team', 'Profile'].map((item, idx) => (
             <div key={item} className="flex flex-col items-center gap-1 p-2">
                 <div className={`w-5 h-5 rounded-full ${idx === 0 ? 'bg-cico-blue' : 'bg-slate-200'}`}></div>
                 <div className="w-8 h-1 bg-slate-100 rounded-full"></div>
             </div>
         ))}
      </div>
      
      {/* Home Indicator */}
      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1/3 h-1 bg-slate-900 rounded-full"></div>
    </div>
  );
};

export default AppMockup;
