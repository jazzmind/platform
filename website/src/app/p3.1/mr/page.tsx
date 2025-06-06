import React from 'react';
import { Glasses, Box, Play, Settings, Monitor, Headphones } from 'lucide-react';

export default function MixedRealityPage() {
  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mixed Reality</h1>
          <p className="text-slate-600 mt-1">Immersive learning experiences and spatial collaboration</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="border border-slate-300 px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Device Setup
          </button>
          <button className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2">
            <Play className="w-4 h-4" />
            Launch Experience
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Active Sessions</p>
              <p className="text-2xl font-bold text-slate-900">3</p>
            </div>
            <Glasses className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">VR Spaces</p>
              <p className="text-2xl font-bold text-slate-900">12</p>
            </div>
            <Box className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Connected Users</p>
              <p className="text-2xl font-bold text-slate-900">28</p>
            </div>
            <Headphones className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Experiences</p>
              <p className="text-2xl font-bold text-slate-900">7</p>
            </div>
            <Monitor className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Available Experiences</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Box className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="font-medium text-slate-900 mb-2">3D Design Studio</h4>
            <p className="text-sm text-slate-600 mb-4">Collaborative 3D modeling and prototyping space</p>
            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">
              Enter Studio
            </button>
          </div>
          
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Monitor className="w-6 h-6 text-green-600" />
            </div>
            <h4 className="font-medium text-slate-900 mb-2">Data Visualization Lab</h4>
            <p className="text-sm text-slate-600 mb-4">Immersive analytics and data exploration environment</p>
            <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700">
              Launch Lab
            </button>
          </div>
          
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Headphones className="w-6 h-6 text-purple-600" />
            </div>
            <h4 className="font-medium text-slate-900 mb-2">Virtual Auditorium</h4>
            <p className="text-sm text-slate-600 mb-4">Large-scale presentations and conferences</p>
            <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700">
              Join Event
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 