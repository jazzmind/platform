import { useState } from 'react';
import { 
  Users,
  Building,
  Target,
  X,
  Check,
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { BulkImportModalProps } from '@/src/types/chat';

export default function BulkImportModal({ isOpen, onClose, data, onConfirm }: BulkImportModalProps) {
  const [selectedOpportunities, setSelectedOpportunities] = useState<Set<number>>(new Set());
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  const [selectedOrganizations, setSelectedOrganizations] = useState<Set<number>>(new Set());

  if (!isOpen) return null;

  const handleConfirm = () => {
    const selectedData = {
      opportunities: data?.opportunities?.filter((_, index) => selectedOpportunities.has(index)) || [],
      contacts: data?.contacts?.filter((_, index) => selectedContacts.has(index)) || [],
      organizations: data?.organizations?.filter((_, index) => selectedOrganizations.has(index)) || []
    };
    onConfirm(selectedData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Confirm Data Import
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* Opportunities */}
          {data?.opportunities && data.opportunities.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Opportunities ({data.opportunities.length})
              </h3>
              <div className="space-y-2">
                {data.opportunities.map((opp, index) => (
                  <div key={index} className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <input
                      type="checkbox"
                      checked={selectedOpportunities.has(index)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedOpportunities);
                        if (e.target.checked) {
                          newSelected.add(index);
                        } else {
                          newSelected.delete(index);
                        }
                        setSelectedOpportunities(newSelected);
                      }}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{opp.title}</p>
                      {opp.value && <p className="text-sm text-gray-500">${opp.value.toLocaleString()}</p>}
                      {opp.status && <p className="text-sm text-gray-500">Status: {opp.status}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contacts */}
          {data?.contacts && data.contacts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Contacts ({data.contacts.length})
              </h3>
              <div className="space-y-2">
                {data.contacts.map((contact, index) => (
                  <div key={index} className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <input
                      type="checkbox"
                      checked={selectedContacts.has(index)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedContacts);
                        if (e.target.checked) {
                          newSelected.add(index);
                        } else {
                          newSelected.delete(index);
                        }
                        setSelectedContacts(newSelected);
                      }}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{contact.name}</p>
                      {contact.email && <p className="text-sm text-gray-500">{contact.email}</p>}
                      {contact.title && <p className="text-sm text-gray-500">{contact.title}</p>}
                      {contact.organization && <p className="text-sm text-gray-500">at {contact.organization}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Organizations */}
          {data?.organizations && data.organizations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Organizations ({data.organizations.length})
              </h3>
              <div className="space-y-2">
                {data.organizations.map((org, index) => (
                  <div key={index} className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <input
                      type="checkbox"
                      checked={selectedOrganizations.has(index)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedOrganizations);
                        if (e.target.checked) {
                          newSelected.add(index);
                        } else {
                          newSelected.delete(index);
                        }
                        setSelectedOrganizations(newSelected);
                      }}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{org.name}</p>
                      {org.website && <p className="text-sm text-gray-500">{org.website}</p>}
                      {org.sector && <p className="text-sm text-gray-500">Sector: {org.sector}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {selectedOpportunities.size} opportunities, {selectedContacts.size} contacts, {selectedOrganizations.size} organizations selected
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>Import Selected</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 