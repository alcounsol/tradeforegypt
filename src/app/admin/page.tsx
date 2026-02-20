'use client'

import { useEffect, useState } from 'react'
import { getAllUsers, getUserRole, updateUserRole, toggleUserActive, UserProfile, UserRole } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import {
  Card, CardBody, CardHeader, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Button, Select, SelectItem, Chip, Spinner, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure, Input
} from '@nextui-org/react'
import { Users, Shield, Trash2, Edit2, Plus, Search, AlertCircle } from 'lucide-react'
import PageHeader from '@/components/PageHeader'

const roleLabels: Record<UserRole, string> = {
  admin: '👑 مسؤول',
  call_center: '📞 كول سنتر',
  follow_up: '📋 متابعة',
  sales: '📈 مبيعات',
  maintenance: '🔧 صيانة',
  reception: '🎫 استقبال',
  hr: '👥 موارد بشرية',
  finance: '💰 مالية',
}

const roleColors: Record<UserRole, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'> = {
  admin: 'danger',
  call_center: 'primary',
  follow_up: 'secondary',
  sales: 'success',
  maintenance: 'warning',
  reception: 'default',
  hr: 'secondary',
  finance: 'success',
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [newRole, setNewRole] = useState<UserRole>('call_center')
  const { isOpen, onOpen, onOpenChange } = useDisclosure()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const role = await getUserRole()
      setUserRole(role)

      if (role !== 'admin') {
        return
      }

      const allUsers = await getAllUsers()
      setUsers(allUsers)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user)
    setNewRole(user.role)
    onOpen()
  }

  const handleUpdateRole = async () => {
    if (!selectedUser) return

    try {
      await updateUserRole(selectedUser.id, newRole)
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, role: newRole } : u))
      onOpenChange()
    } catch (error) {
      console.error('Error updating role:', error)
    }
  }

  const handleToggleActive = async (user: UserProfile) => {
    try {
      await toggleUserActive(user.id, !user.is_active)
      setUsers(users.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u))
    } catch (error) {
      console.error('Error toggling user status:', error)
    }
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchValue.toLowerCase()) ||
    (user.full_name && user.full_name.toLowerCase().includes(searchValue.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    )
  }

  if (userRole !== 'admin') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="إدارة المستخدمين"
          description="لوحة تحكم المسؤول"
          icon={Shield}
        />
        <Card className="border-red-200 bg-red-50">
          <CardBody className="flex flex-row gap-4 p-6">
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-red-900">وصول مرفوض</h3>
              <p className="text-sm text-red-800">أنت لا تملك صلاحية الوصول إلى هذه الصفحة. يرجى التواصل مع المسؤول.</p>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="إدارة المستخدمين"
        description="إدارة حسابات المستخدمين والصلاحيات"
        icon={Shield}
      />

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="gap-2 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">إجمالي المستخدمين</p>
                <p className="text-2xl font-bold text-gray-800">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="gap-2 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">المسؤولين</p>
                <p className="text-2xl font-bold text-gray-800">{users.filter(u => u.role === 'admin').length}</p>
              </div>
              <Shield className="h-8 w-8 text-red-500" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="gap-2 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">نشطين</p>
                <p className="text-2xl font-bold text-gray-800">{users.filter(u => u.is_active).length}</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <div className="h-3 w-3 bg-green-500 rounded-full" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="gap-2 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">معطلين</p>
                <p className="text-2xl font-bold text-gray-800">{users.filter(u => !u.is_active).length}</p>
              </div>
              <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="h-3 w-3 bg-gray-500 rounded-full" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="flex justify-between items-center border-b border-gray-200 p-6">
          <h3 className="text-lg font-bold">قائمة المستخدمين</h3>
          <Input
            isClearable
            className="w-full max-w-xs"
            placeholder="ابحث عن مستخدم..."
            startContent={<Search className="h-4 w-4 text-gray-400" />}
            value={searchValue}
            onValueChange={setSearchValue}
          />
        </CardHeader>

        <CardBody className="p-0">
          <Table aria-label="Users table">
            <TableHeader>
              <TableColumn className="text-right">البريد الإلكتروني</TableColumn>
              <TableColumn className="text-right">الاسم</TableColumn>
              <TableColumn className="text-right">الدور</TableColumn>
              <TableColumn className="text-right">الحالة</TableColumn>
              <TableColumn className="text-right">تاريخ الإنشاء</TableColumn>
              <TableColumn className="text-right">الإجراءات</TableColumn>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="text-right">
                    <p className="text-sm font-medium">{user.email}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <p className="text-sm">{user.full_name || '-'}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <Chip
                      size="sm"
                      variant="flat"
                      color={roleColors[user.role]}
                      startContent={user.role === 'admin' ? '👑' : undefined}
                    >
                      {roleLabels[user.role]}
                    </Chip>
                  </TableCell>
                  <TableCell className="text-right">
                    <Chip
                      size="sm"
                      variant="flat"
                      color={user.is_active ? 'success' : 'default'}
                    >
                      {user.is_active ? '✓ نشط' : '✗ معطل'}
                    </Chip>
                  </TableCell>
                  <TableCell className="text-right">
                    <p className="text-sm">
                      {new Date(user.created_at).toLocaleDateString('ar-EG')}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit2 className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onClick={() => handleToggleActive(user)}
                      >
                        {user.is_active ? (
                          <div className="h-4 w-4 bg-green-500 rounded-full" />
                        ) : (
                          <div className="h-4 w-4 bg-gray-300 rounded-full" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Edit User Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                تعديل المستخدم
              </ModalHeader>
              <ModalBody>
                {selectedUser && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">البريد الإلكتروني</p>
                      <p className="text-sm text-gray-600">{selectedUser.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">الدور</p>
                      <Select
                        selectedKeys={[newRole]}
                        onChange={(e) => setNewRole(e.target.value as UserRole)}
                      >
                        <SelectItem key="admin" value="admin">👑 مسؤول</SelectItem>
                        <SelectItem key="call_center" value="call_center">📞 كول سنتر</SelectItem>
                        <SelectItem key="follow_up" value="follow_up">📋 متابعة</SelectItem>
                        <SelectItem key="sales" value="sales">📈 مبيعات</SelectItem>
                        <SelectItem key="maintenance" value="maintenance">🔧 صيانة</SelectItem>
                        <SelectItem key="reception" value="reception">🎫 استقبال</SelectItem>
                        <SelectItem key="hr" value="hr">👥 موارد بشرية</SelectItem>
                        <SelectItem key="finance" value="finance">💰 مالية</SelectItem>
                      </Select>
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  إلغاء
                </Button>
                <Button color="primary" onPress={handleUpdateRole}>
                  حفظ التغييرات
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
