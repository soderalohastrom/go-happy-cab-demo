import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import DateNavigator from './components/DateNavigator';
import './index.css';

function PairingUI() {
  // Date state - default to today
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [activeTab, setActiveTab] = useState('AM');
  const [sortBy, setSortBy] = useState('child');

  // Convex queries
  const allChildren = useQuery(api.children.list) || [];
  const allDrivers = useQuery(api.drivers.list) || [];
  const unassignedChildren = useQuery(api.assignments.getUnassignedChildren, {
    date: selectedDate,
    period: activeTab,
  }) || [];
  const unassignedDrivers = useQuery(api.assignments.getUnassignedDrivers, {
    date: selectedDate,
    period: activeTab,
  }) || [];
  const assignmentsData = useQuery(api.assignments.getForDate, { date: selectedDate });
  const calendarData = useQuery(api.assignments.getForDateRange, {
    startDate: getMonthStart(selectedDate),
    endDate: getMonthEnd(selectedDate),
  }) || {};

  // Convex mutations
  const createAssignment = useMutation(api.assignments.create);
  const removeAssignment = useMutation(api.assignments.remove);

  const sensors = useSensors(
    useSensor(TouchSensor, {
      distance: 0,
      delay: 100,
      tolerance: 0,
    }),
    useSensor(PointerSensor, {
      distance: 8,
    })
  );

  const currentAssignments = assignmentsData?.[activeTab] || [];

  const sortedUnpairedChildren = useMemo(
    () => [...unassignedChildren].sort((a, b) => a.name.localeCompare(b.name)),
    [unassignedChildren]
  );

  const sortedUnpairedDrivers = useMemo(
    () => [...unassignedDrivers].sort((a, b) => a.name.localeCompare(b.name)),
    [unassignedDrivers]
  );

  const sortedPaired = useMemo(() => {
    const sorted = [...currentAssignments];
    if (sortBy === 'child') {
      return sorted.sort((a, b) => a.childName.localeCompare(b.childName));
    } else {
      return sorted.sort((a, b) => a.driverName.localeCompare(b.driverName));
    }
  }, [currentAssignments, sortBy]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over) return;

    const [type, id] = active.id.toString().split('-');
    const [overType, overId] = over.id.toString().split('-');

    // Child dragged onto Driver
    if (type === 'child' && overType === 'driver') {
      const child = unassignedChildren.find((c) => c._id === id);
      const driver = unassignedDrivers.find((d) => d._id === overId);

      if (child && driver) {
        try {
          await createAssignment({
            date: selectedDate,
            period: activeTab,
            childId: child._id,
            driverId: driver._id,
            status: 'scheduled',
          });
        } catch (error) {
          console.error('Failed to create assignment:', error);
          alert(error.message || 'Failed to create assignment');
        }
      }
    }

    // Driver dragged onto Child
    if (type === 'driver' && overType === 'child') {
      const driver = unassignedDrivers.find((d) => d._id === id);
      const child = unassignedChildren.find((c) => c._id === overId);

      if (driver && child) {
        try {
          await createAssignment({
            date: selectedDate,
            period: activeTab,
            childId: child._id,
            driverId: driver._id,
            status: 'scheduled',
          });
        } catch (error) {
          console.error('Failed to create assignment:', error);
          alert(error.message || 'Failed to create assignment');
        }
      }
    }
  };

  const handleUnpair = async (assignment) => {
    try {
      await removeAssignment({ id: assignment._id });
    } catch (error) {
      console.error('Failed to remove assignment:', error);
      alert('Failed to remove assignment');
    }
  };

  const DraggableChild = ({ child }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: `child-${child._id}`,
    });

    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={`bg-rose-50 border-2 border-rose-300 p-3 rounded-lg cursor-move transition touch-none select-none ${
          isDragging
            ? 'opacity-50 scale-95 bg-rose-100 shadow-lg'
            : 'hover:bg-rose-100 hover:shadow-md'
        }`}
        style={{
          touchAction: 'none',
        }}
      >
        <div className="font-semibold text-rose-900">↕️ {child.name}</div>
        <div className="text-xs text-rose-700 mt-1">📍 Needs driver</div>
      </div>
    );
  };

  const DraggableDriver = ({ driver }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: `driver-${driver._id}`,
    });

    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={`bg-blue-50 border-2 border-blue-300 p-3 rounded-lg cursor-move transition touch-none select-none ${
          isDragging
            ? 'opacity-50 scale-95 bg-blue-100 shadow-lg'
            : 'hover:bg-blue-100 hover:shadow-md'
        }`}
        style={{
          touchAction: 'none',
        }}
      >
        <div className="font-semibold text-blue-900">↕️ {driver.name}</div>
        <div className="text-xs text-blue-700 mt-1">🚕 Available</div>
      </div>
    );
  };

  const DroppableZone = ({ id, children }) => {
    const { setNodeRef, isOver } = useDroppable({
      id,
    });

    return (
      <div
        ref={setNodeRef}
        className={`space-y-3 transition ${isOver ? 'bg-indigo-50 p-2 rounded' : ''}`}
      >
        {children}
      </div>
    );
  };

  // Show loading state
  if (!assignmentsData || !allChildren || !allDrivers) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏱️</div>
          <div className="text-xl font-semibold text-gray-700">Loading...</div>
          <div className="text-sm text-gray-500 mt-2">
            Connecting to Convex database
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              ⏱️ Go Happy Cab - Daily Route Manager
            </h1>
            <p className="text-gray-600">
              Schedule and manage child-driver assignments. Select a date and drag children to
              drivers.
            </p>
          </div>

          {/* Date Navigator */}
          <DateNavigator
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            assignmentCounts={calendarData}
          />

          {/* Tab Navigation */}
          <div className="flex gap-4 mb-8">
            {['AM', 'PM'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-lg font-bold text-lg transition ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-indigo-400'
                }`}
              >
                {tab} Routes
              </button>
            ))}
          </div>

          {/* Main Layout */}
          <div className="space-y-6">
            {/* Top Row: Children & Drivers */}
            <div className="grid grid-cols-2 gap-6">
              {/* LEFT: Unpaired Children */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Unassigned Children ({sortedUnpairedChildren.length})
                </h2>
                <p className="text-xs text-gray-500 mb-4">Sorted alphabetically</p>
                <DroppableZone id="children-zone">
                  {sortedUnpairedChildren.length === 0 ? (
                    <p className="text-gray-400 text-sm italic">
                      All children assigned! 🎉
                    </p>
                  ) : (
                    sortedUnpairedChildren.map((child) => (
                      <DraggableChild key={child._id} child={child} />
                    ))
                  )}
                </DroppableZone>
              </div>

              {/* RIGHT: Unpaired Drivers */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Unassigned Drivers ({sortedUnpairedDrivers.length})
                </h2>
                <p className="text-xs text-gray-500 mb-4">Sorted alphabetically</p>
                <DroppableZone id="drivers-zone">
                  {sortedUnpairedDrivers.length === 0 ? (
                    <p className="text-gray-400 text-sm italic">
                      All drivers assigned! 🎉
                    </p>
                  ) : (
                    sortedUnpairedDrivers.map((driver) => (
                      <DraggableDriver key={driver._id} driver={driver} />
                    ))
                  )}
                </DroppableZone>
              </div>
            </div>

            {/* Bottom Row: Active Routes (Full Width) */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  Active Routes ({sortedPaired.length})
                </h2>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-gray-500">Sort by:</p>
                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setSortBy('child')}
                      className={`px-3 py-2 rounded transition font-semibold text-sm ${
                        sortBy === 'child'
                          ? 'bg-white text-indigo-700 shadow-sm border border-indigo-300'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Child
                    </button>
                    <span className="text-gray-400 px-2">↔️</span>
                    <button
                      onClick={() => setSortBy('driver')}
                      className={`px-3 py-2 rounded transition font-semibold text-sm ${
                        sortBy === 'driver'
                          ? 'bg-white text-indigo-700 shadow-sm border border-indigo-300'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Driver
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                {sortBy === 'child' ? 'Sorted A-Z by child name' : 'Sorted A-Z by driver name'}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto">
                {sortedPaired.length === 0 ? (
                  <p className="text-gray-400 text-sm italic col-span-full">
                    No active routes for this period
                  </p>
                ) : (
                  sortedPaired.map((pairing) => (
                    <div
                      key={pairing._id}
                      className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-lg p-4 transition-all duration-300 ease-in-out"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-bold text-green-900 text-sm">
                          👧 {pairing.childName}
                        </div>
                        <button
                          onClick={() => handleUnpair(pairing)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition flex-shrink-0"
                          title="Unzip pairing"
                        >
                          🗑️
                        </button>
                      </div>
                      <div className="flex items-center justify-center my-2 text-green-600 font-bold text-lg">
                        ↔️
                      </div>
                      <div className="font-bold text-green-900 text-sm">
                        🚗 {pairing.driverName}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h3 className="font-bold text-indigo-900 mb-2">How to use:</h3>
            <ul className="text-sm text-indigo-800 space-y-1 ml-4 list-disc">
              <li>
                <strong>Select date:</strong> Use calendar or prev/next buttons to choose a date
              </li>
              <li>
                <strong>Switch routes:</strong> Click AM or PM tabs to view/edit each period
              </li>
              <li>
                <strong>Create pairing:</strong> Drag a child to a driver (or drag a driver to a
                child)
              </li>
              <li>
                <strong>Sort routes:</strong> Click "Child" or "Driver" to sort active routes
              </li>
              <li>
                <strong>Unzip pairing:</strong> Click trash icon to remove assignment
              </li>
              <li>
                <strong>Calendar view:</strong> Numbers show assignment counts (orange=AM,
                blue=PM)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </DndContext>
  );
}

// Helper functions for date range calculation
function getMonthStart(dateStr) {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth();
  return new Date(year, month, 1).toISOString().split('T')[0];
}

function getMonthEnd(dateStr) {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth();
  return new Date(year, month + 1, 0).toISOString().split('T')[0];
}

export default PairingUI;
