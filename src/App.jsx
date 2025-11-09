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
  DragOverlay,
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
  const [activeDragItem, setActiveDragItem] = useState(null);
  const [toast, setToast] = useState(null);

  // Carpool state: Map of driverId -> array of childIds (temporary, before "Done")
  const [driverCarpools, setDriverCarpools] = useState(new Map());

  // Track expanded carpool groups in paired assignments display
  const [expandedDrivers, setExpandedDrivers] = useState(new Set());

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
  const copyFromPreviousDay = useMutation(api.assignments.copyFromPreviousDay);

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
    () => [...unassignedChildren].sort((a, b) => {
      const aName = `${a.firstName || ''} ${a.lastName || ''}`.trim();
      const bName = `${b.firstName || ''} ${b.lastName || ''}`.trim();
      return aName.localeCompare(bName);
    }),
    [unassignedChildren]
  );

  const sortedUnpairedDrivers = useMemo(
    () => [...unassignedDrivers].sort((a, b) => {
      const aName = `${a.firstName || ''} ${a.lastName || ''}`.trim();
      const bName = `${b.firstName || ''} ${b.lastName || ''}`.trim();
      return aName.localeCompare(bName);
    }),
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

  // Group assignments by driver for carpool display
  const carpoolGroups = useMemo(() => {
    const groups = new Map();
    currentAssignments.forEach(assignment => {
      const driverId = assignment.driverId;
      if (!groups.has(driverId)) {
        groups.set(driverId, {
          driverId,
          driverName: assignment.driverName,
          assignments: []
        });
      }
      groups.get(driverId).assignments.push(assignment);
    });
    return Array.from(groups.values()).sort((a, b) => a.driverName.localeCompare(b.driverName));
  }, [currentAssignments]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDragStart = (event) => {
    const { active } = event;
    const activeIdParts = active.id.toString().split('-');
    const draggedType = activeIdParts[0];
    const draggedId = activeIdParts.slice(1).join('-');

    if (draggedType === 'child') {
      const child = unassignedChildren.find((c) => c._id === draggedId);
      if (child) {
        setActiveDragItem({
          type: 'child',
          data: child,
        });
      }
    } else if (draggedType === 'driver') {
      const driver = unassignedDrivers.find((d) => d._id === draggedId);
      if (driver) {
        setActiveDragItem({
          type: 'driver',
          data: driver,
        });
      }
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    // Parse the dragged item ID
    const activeIdParts = active.id.toString().split('-');
    const draggedType = activeIdParts[0]; // 'child' (drivers no longer draggable)
    const draggedId = activeIdParts.slice(1).join('-'); // Handle IDs with hyphens

    // Parse the drop target ID
    const overIdParts = over.id.toString().split('-');

    // Check if it's a drop zone (format: "driver-drop-{id}")
    let targetType, targetId;
    if (overIdParts[1] === 'drop') {
      targetType = overIdParts[0]; // 'driver'
      targetId = overIdParts.slice(2).join('-');
    } else {
      // Handle old format for backwards compatibility
      targetType = overIdParts[0];
      targetId = overIdParts.slice(1).join('-');
    }

    // Child dragged onto Driver (one-directional drag)
    if (draggedType === 'child' && (targetType === 'driver' || targetType === 'driver-drop')) {
      const child = unassignedChildren.find((c) => c._id === draggedId);
      const driver = unassignedDrivers.find((d) => d._id === targetId) ||
                     allDrivers.find((d) => d._id === targetId); // Check all drivers for carpool support

      if (child && driver) {
        // Get current carpool for this driver
        const currentCarpool = driverCarpools.get(driver._id) || [];

        // Validate max 3 children
        if (currentCarpool.length >= 3) {
          showToast(`❌ Max 3 children per driver. ${driver.firstName} is full!`, 'error');
          return;
        }

        // Check if child already in this carpool
        if (currentCarpool.includes(child._id)) {
          showToast(`⚠️ ${child.firstName} already in this carpool`, 'error');
          return;
        }

        // Add child to temporary carpool state
        setDriverCarpools(prev => {
          const next = new Map(prev);
          next.set(driver._id, [...currentCarpool, child._id]);
          return next;
        });

        showToast(`➕ Added ${child.firstName} to ${driver.firstName}'s carpool (${currentCarpool.length + 1}/3)`);
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

  // Handle "Done" button click - creates actual routes from carpool
  const handleDoneClick = async (driverId) => {
    const childIds = driverCarpools.get(driverId) || [];
    if (childIds.length === 0) return;

    const driver = allDrivers.find(d => d._id === driverId);
    if (!driver) return;

    try {
      // Create route for each child in carpool
      for (const childId of childIds) {
        await createAssignment({
          date: selectedDate,
          period: activeTab,
          childId,
          driverId,
          status: 'scheduled',
        });
      }

      // Show success toast
      showToast(`✅ Carpool created: ${driver.firstName} ${driver.lastName} → ${childIds.length} rider${childIds.length > 1 ? 's' : ''}`);

      // Clear temporary carpool state for this driver
      setDriverCarpools(prev => {
        const next = new Map(prev);
        next.delete(driverId);
        return next;
      });
    } catch (error) {
      console.error('Failed to create carpool:', error);
      showToast(error.message || 'Failed to create carpool', 'error');
    }
  };

  // Toggle carpool expansion
  const toggleDriverExpansion = (driverId) => {
    setExpandedDrivers(prev => {
      const next = new Set(prev);
      if (next.has(driverId)) {
        next.delete(driverId);
      } else {
        next.add(driverId);
      }
      return next;
    });
  };

  // Remove entire carpool
  const handleRemoveCarpool = async (carpoolGroup) => {
    try {
      // Remove all assignments for this driver
      for (const assignment of carpoolGroup.assignments) {
        await removeAssignment({ id: assignment._id });
      }
      showToast(`✅ Removed carpool: ${carpoolGroup.driverName} (${carpoolGroup.assignments.length} riders)`);
    } catch (error) {
      console.error('Failed to remove carpool:', error);
      showToast('Failed to remove carpool', 'error');
    }
  };

  const DraggableChild = ({ child }) => {
    const { attributes, listeners, setNodeRef: dragRef, isDragging } = useDraggable({
      id: `child-${child._id}`,
    });

    // Make child droppable for drivers
    const { setNodeRef: dropRef, isOver } = useDroppable({
      id: `child-drop-${child._id}`,
    });

    // Combine both refs
    const combinedRef = (el) => {
      dragRef(el);
      dropRef(el);
    };

    return (
      <div
        ref={combinedRef}
        {...listeners}
        {...attributes}
        className={`bg-rose-50 border-2 p-3 rounded-lg cursor-move transition-all duration-200 touch-none select-none ${
          isDragging
            ? 'opacity-50 scale-95 bg-rose-100 shadow-lg border-rose-400'
            : isOver
            ? 'bg-rose-200 border-rose-500 shadow-xl scale-110 border-dashed border-4 ring-4 ring-rose-300 animate-pulse'
            : 'border-rose-300 hover:bg-rose-100 hover:shadow-md hover:scale-105'
        }`}
        style={{
          touchAction: 'none',
        }}
      >
        <div className="font-semibold text-rose-900">👧 {child.firstName} {child.lastName}</div>
        <div className="text-xs text-rose-700 mt-1">📍 Needs driver</div>
      </div>
    );
  };

  const DraggableDriver = ({ driver }) => {
    // Drivers are drop zones only (not draggable)
    const { setNodeRef, isOver } = useDroppable({
      id: `driver-drop-${driver._id}`,
    });

    // Get carpool children for this driver
    const carpoolChildIds = driverCarpools.get(driver._id) || [];
    const carpoolChildren = carpoolChildIds
      .map(childId => allChildren.find(c => c._id === childId))
      .filter(Boolean);

    const hasCarpool = carpoolChildren.length > 0;

    return (
      <div
        ref={setNodeRef}
        className={`bg-blue-50 border-2 p-3 rounded-lg cursor-pointer transition-all duration-200 touch-none select-none flex flex-col ${
          hasCarpool ? 'min-h-[240px]' : 'min-h-[120px]'
        } ${
          isOver
            ? 'bg-blue-200 border-blue-500 shadow-xl scale-105 border-dashed border-4 ring-4 ring-blue-300 animate-pulse'
            : 'border-blue-300 hover:bg-blue-100 hover:shadow-md'
        }`}
        style={{
          touchAction: 'none',
        }}
      >
        {/* Driver Header */}
        <div className="font-semibold text-blue-900">🚗 {driver.firstName} {driver.lastName}</div>

        {/* Carpool Children (Vertical Stack) */}
        {hasCarpool ? (
          <div className="mt-2 mb-2 flex-1">
            {carpoolChildren.map((child, idx) => (
              <div key={child._id} className="text-sm text-blue-800 pl-4 py-1">
                👧 {child.firstName} {child.lastName}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-blue-700 mt-1">🚕 Available</div>
        )}

        {/* Bottom Row: Counter + Done Button */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-blue-200">
          {/* Rider Counter */}
          <div className="text-xs text-blue-700">
            {hasCarpool ? `Riders: ${carpoolChildren.length}` : ''}
          </div>

          {/* Done Button (Prominent Checkmark) */}
          {hasCarpool && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDoneClick(driver._id);
              }}
              className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 text-white text-2xl flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
            >
              ✓
            </button>
          )}
        </div>
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
      onDragStart={handleDragStart}
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

          {/* Copy from Previous Day Button - Show when no assignments exist */}
          {assignmentsData && assignmentsData.AM.length === 0 && assignmentsData.PM.length === 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-900 font-semibold">No assignments for {selectedDate}</p>
                  <p className="text-yellow-700 text-sm mt-1">
                    Start fresh or copy the standard routes from the previous day
                  </p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const result = await copyFromPreviousDay({
                        targetDate: selectedDate
                      });
                      alert(result.message);
                    } catch (error) {
                      console.error('Copy failed:', error);
                      alert(error.message || 'Failed to copy assignments from previous day');
                    }
                  }}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition font-semibold flex items-center gap-2"
                >
                  📋 Copy Previous Day's Routes
                </button>
              </div>
            </div>
          )}

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

            {/* Bottom Row: Active Routes (Carpool Groups) */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  Active Routes ({currentAssignments.length} total)
                </h2>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Grouped by driver - Click to expand carpool details
              </p>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {carpoolGroups.length === 0 ? (
                  <p className="text-gray-400 text-sm italic">
                    No active routes for this period
                  </p>
                ) : (
                  carpoolGroups.map((carpoolGroup) => {
                    const isExpanded = expandedDrivers.has(carpoolGroup.driverId);
                    const riderCount = carpoolGroup.assignments.length;

                    return (
                      <div
                        key={carpoolGroup.driverId}
                        className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-lg overflow-hidden"
                      >
                        {/* Driver Header (Clickable) */}
                        <div
                          onClick={() => toggleDriverExpansion(carpoolGroup.driverId)}
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-green-100 transition"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🚗</span>
                            <div>
                              <div className="font-bold text-green-900">
                                {carpoolGroup.driverName}
                              </div>
                              <div className="text-xs text-green-700">
                                {riderCount} rider{riderCount > 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Remove Entire Carpool Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveCarpool(carpoolGroup);
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition"
                              title="Remove entire carpool"
                            >
                              🗑️
                            </button>
                            {/* Expand/Collapse Chevron */}
                            <span className="text-green-700 text-xl">
                              {isExpanded ? '˄' : '˅'}
                            </span>
                          </div>
                        </div>

                        {/* Expanded Children List */}
                        {isExpanded && (
                          <div className="border-t-2 border-green-300 bg-green-50 p-4">
                            {carpoolGroup.assignments.map((assignment) => (
                              <div
                                key={assignment._id}
                                className="flex items-center justify-between py-2 px-3 mb-2 last:mb-0 bg-white rounded border border-green-200"
                              >
                                <div className="flex items-center gap-2">
                                  <span>👧</span>
                                  <span className="font-medium text-green-900">
                                    {assignment.childName}
                                  </span>
                                </div>
                                {/* Individual Remove Button */}
                                <button
                                  onClick={() => handleUnpair(assignment)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition text-sm"
                                  title="Remove this child"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h3 className="font-bold text-indigo-900 mb-2">How to use (Carpool Mode):</h3>
            <ul className="text-sm text-indigo-800 space-y-1 ml-4 list-disc">
              <li>
                <strong>Select date:</strong> Use calendar or prev/next buttons to choose a date
              </li>
              <li>
                <strong>Switch routes:</strong> Click AM or PM tabs to view/edit each period
              </li>
              <li>
                <strong>Build carpool:</strong> Drag children one-by-one onto a driver (max 3)
              </li>
              <li>
                <strong>Create routes:</strong> Click green ✓ button when carpool is ready
              </li>
              <li>
                <strong>View carpools:</strong> Click driver name to expand/collapse child list
              </li>
              <li>
                <strong>Remove routes:</strong> Click 🗑️ to remove entire carpool or individual child
              </li>
              <li>
                <strong>Calendar view:</strong> Numbers show assignment counts (orange=AM,
                blue=PM)
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* DragOverlay for desktop visual feedback */}
      <DragOverlay dropAnimation={null}>
        {activeDragItem ? (
          <div
            className={`${
              activeDragItem.type === 'child'
                ? 'bg-rose-100 border-rose-400'
                : 'bg-blue-100 border-blue-400'
            } border-2 p-3 rounded-lg shadow-2xl cursor-grabbing opacity-90 transform scale-110`}
            style={{ touchAction: 'none' }}
          >
            <div
              className={`font-semibold ${
                activeDragItem.type === 'child' ? 'text-rose-900' : 'text-blue-900'
              }`}
            >
              {activeDragItem.type === 'child' ? '👧' : '🚗'}{' '}
              {activeDragItem.data.firstName} {activeDragItem.data.lastName}
            </div>
            <div
              className={`text-xs mt-1 ${
                activeDragItem.type === 'child' ? 'text-rose-700' : 'text-blue-700'
              }`}
            >
              {activeDragItem.type === 'child' ? '📍 Drag to driver' : '🚕 Drag to child'}
            </div>
          </div>
        ) : null}
      </DragOverlay>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-2xl transform transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}
          style={{ animation: 'slideInRight 0.3s ease-out' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{toast.type === 'success' ? '✅' : '❌'}</span>
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
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
