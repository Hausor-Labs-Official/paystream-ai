"use client"

import * as React from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconDotsVertical,
  IconGripVertical,
  IconLayoutColumns,
  IconLoader,
  IconPlus,
  IconExternalLink,
} from "@tabler/icons-react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import { toast } from "sonner"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRouter } from "next/navigation"
import { User, Mail, DollarSign, XCircle } from "lucide-react"

export const employeeSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  wallet_address: z.string().optional(),
  salary_usd: z.number(),
  status: z.enum(['pending', 'active', 'paid', 'inactive']),
  created_at: z.string().optional(),
})

type EmployeeData = z.infer<typeof employeeSchema>

// Drag handle component
function DragHandle({ id }: { id: number }) {
  const { attributes, listeners } = useSortable({ id })

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="text-muted-foreground size-7 hover:bg-transparent"
    >
      <IconGripVertical className="text-muted-foreground size-3" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}

// Employee detail viewer
function EmployeeDetailViewer({ employee }: { employee: EmployeeData }) {
  const isMobile = useIsMobile()

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="text-foreground w-fit px-0 text-left">
          {employee.name}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{employee.name}</DrawerTitle>
          <DrawerDescription>Employee Details & Information</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          <div className="grid gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Full Name</p>
              <p className="font-medium">{employee.name}</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Email Address</p>
              <p className="font-medium">{employee.email}</p>
            </div>

            {employee.wallet_address && (
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Wallet Address</p>
                <p className="font-mono text-xs break-all">{employee.wallet_address}</p>
                <a
                  href={`https://testnet.arcscan.app/address/${employee.wallet_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0044FF] hover:underline mt-2 inline-block"
                >
                  View on Arc Testnet Explorer →
                </a>
              </div>
            )}

            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Annual Salary</p>
              <p className="font-medium text-lg">${employee.salary_usd.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <DrawerFooter>
          <Button>View Full Profile</Button>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

// Columns are now defined inside the component using editableColumns

function DraggableRow({ row }: { row: Row<EmployeeData> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  })

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

export function EmployeeDataTable({
  data: initialData,
  onDataChange,
  onAddEmployee,
}: {
  data: EmployeeData[]
  onDataChange?: (data: EmployeeData[]) => void
  onAddEmployee?: () => void
}) {
  const router = useRouter()
  const [data, setData] = React.useState(() => initialData)
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [editingCell, setEditingCell] = React.useState<{ rowId: number; field: string } | null>(null)
  const [editValue, setEditValue] = React.useState<string>("")

  const sortableId = React.useId()
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ id }) => id) || [],
    [data]
  )

  // Update data when initialData changes
  React.useEffect(() => {
    setData(initialData)
  }, [initialData])

  const handleCellEdit = (rowId: number, field: string, value: any) => {
    setEditingCell({ rowId, field })
    setEditValue(String(value || ""))
  }

  const handleCellSave = async () => {
    if (!editingCell) return

    const updatedData = data.map(emp => {
      if (emp.id === editingCell.rowId) {
        const updated = { ...emp }
        if (editingCell.field === 'salary_usd') {
          updated.salary_usd = parseFloat(editValue) || 0
        } else {
          (updated as any)[editingCell.field] = editValue
        }
        return updated
      }
      return emp
    })

    setData(updatedData)
    setEditingCell(null)
    setEditValue("")

    // Notify parent and sync to Supabase
    if (onDataChange) {
      onDataChange(updatedData)
    }

    // Sync to Supabase
    try {
      await fetch(`/api/employees/${editingCell.rowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [editingCell.field]: editingCell.field === 'salary_usd'
            ? parseFloat(editValue)
            : editValue
        }),
      })
      toast.success('Changes saved')
    } catch (error) {
      toast.error('Failed to sync changes')
    }
  }

  const handleCellCancel = () => {
    setEditingCell(null)
    setEditValue("")
  }

  // Create editable columns
  const editableColumns: ColumnDef<EmployeeData>[] = React.useMemo(() => [
    {
      id: "drag",
      header: () => null,
      cell: ({ row }) => <DragHandle id={row.original.id} />,
    },
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Employee Name",
      cell: ({ row }) => {
        const isEditing = editingCell?.rowId === row.original.id && editingCell?.field === "name"
        if (isEditing) {
          return (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleCellSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCellSave()
                if (e.key === "Escape") handleCellCancel()
              }}
              autoFocus
              className="h-8"
            />
          )
        }
        return (
          <div
            className="cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors"
            onDoubleClick={() => handleCellEdit(row.original.id, "name", row.original.name)}
            title="Double-click to edit"
          >
            {row.original.name}
          </div>
        )
      },
      enableHiding: false,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => {
        const isEditing = editingCell?.rowId === row.original.id && editingCell?.field === "email"
        if (isEditing) {
          return (
            <Input
              type="email"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleCellSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCellSave()
                if (e.key === "Escape") handleCellCancel()
              }}
              autoFocus
              className="h-8"
            />
          )
        }
        return (
          <div
            className="text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors"
            onDoubleClick={() => handleCellEdit(row.original.id, "email", row.original.email)}
            title="Double-click to edit"
          >
            {row.original.email}
          </div>
        )
      },
    },
    {
      accessorKey: "wallet_address",
      header: "Wallet Address",
      cell: ({ row }) => {
        const isEditing = editingCell?.rowId === row.original.id && editingCell?.field === "wallet_address"
        if (isEditing) {
          return (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleCellSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCellSave()
                if (e.key === "Escape") handleCellCancel()
              }}
              autoFocus
              className="h-8 font-mono text-xs"
            />
          )
        }
        return (
          <div className="flex items-center gap-2">
            <div
              className="font-mono text-xs cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors"
              onDoubleClick={() => handleCellEdit(row.original.id, "wallet_address", row.original.wallet_address)}
              title="Double-click to edit"
            >
              {row.original.wallet_address
                ? `${row.original.wallet_address.slice(0, 6)}...${row.original.wallet_address.slice(-4)}`
                : "Not Set"}
            </div>
            {row.original.wallet_address && (
              <a
                href={`https://testnet.arcscan.app/address/${row.original.wallet_address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0044FF] hover:text-[#0033CC]"
                title="View on Arc Testnet Explorer"
                onClick={(e) => e.stopPropagation()}
              >
                <IconExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "salary_usd",
      header: () => <div className="text-right">Annual Salary</div>,
      cell: ({ row }) => {
        const isEditing = editingCell?.rowId === row.original.id && editingCell?.field === "salary_usd"
        if (isEditing) {
          return (
            <Input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleCellSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCellSave()
                if (e.key === "Escape") handleCellCancel()
              }}
              autoFocus
              className="h-8 text-right"
            />
          )
        }
        return (
          <div
            className="text-right font-medium cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors"
            onDoubleClick={() => handleCellEdit(row.original.id, "salary_usd", row.original.salary_usd)}
            title="Double-click to edit"
          >
            ${row.original.salary_usd.toLocaleString()}
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const statusColors = {
          active: "text-green-600 dark:text-green-400",
          paid: "text-blue-600 dark:text-blue-400",
          pending: "text-yellow-600 dark:text-yellow-400",
          inactive: "text-gray-600 dark:text-gray-400",
        }

        return (
          <Badge variant="outline" className={`px-1.5 ${statusColors[row.original.status]}`}>
            {row.original.status === "active" && <IconCircleCheckFilled className="size-3 mr-1" />}
            {row.original.status === "pending" && <IconLoader className="size-3 mr-1" />}
            {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
              size="icon"
            >
              <IconDotsVertical />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => router.push(`/dashboard/employee/${row.original.id}`)}>
              <User className="w-4 h-4 mr-2" />
              View Employee Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </DropdownMenuItem>
            <DropdownMenuItem>
              <DollarSign className="w-4 h-4 mr-2" />
              Pay Employee
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 focus:text-red-600">
              <XCircle className="w-4 h-4 mr-2" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [editingCell, editValue, router])

  const table = useReactTable({
    data,
    columns: editableColumns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id)
        const newIndex = dataIds.indexOf(over.id)
        return arrayMove(data, oldIndex, newIndex)
      })
    }
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search employees..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns className="size-4" />
                <span className="hidden lg:inline">Columns</span>
                <IconChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={onAddEmployee}
          >
            <IconPlus className="size-4" />
            <span className="hidden lg:inline">Add Employee</span>
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
          sensors={sensors}
          id={sortableId}
        >
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                <SortableContext
                  items={dataIds}
                  strategy={verticalListSortingStrategy}
                >
                  {table.getRowModel().rows.map((row) => (
                    <DraggableRow key={row.id} row={row} />
                  ))}
                </SortableContext>
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={table.getAllColumns().length}
                    className="h-24 text-center"
                  >
                    No employees found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} employee(s) selected.
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              Rows per page
            </Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="w-20 h-8" id="rows-per-page">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <IconChevronsLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <IconChevronLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <IconChevronRight />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <IconChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
