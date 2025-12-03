import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Plus, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { bg } from 'date-fns/locale';
import { toast } from 'sonner';
import logo from '@/assets/logo.jpeg';

interface Interview {
  id: string;
  candidateName: string;
  candidatePhone: string;
  position: string;
  date: Date;
  time: string;
  office: string;
}

const Interviews = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newInterview, setNewInterview] = useState({
    candidateName: '',
    candidatePhone: '',
    position: '',
    time: '',
    office: ''
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Пон', 'Вто', 'Сря', 'Чет', 'Пет', 'Съб', 'Нед'];

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!selectedDate || !newInterview.candidateName || !newInterview.candidatePhone || 
        !newInterview.position || !newInterview.time || !newInterview.office) {
      toast.error('Моля попълнете всички полета');
      return;
    }

    const interview: Interview = {
      id: Date.now().toString(),
      ...newInterview,
      date: selectedDate
    };

    setInterviews([...interviews, interview]);
    toast.success(`Интервю записано за ${format(selectedDate, 'dd MMMM yyyy', { locale: bg })} в ${newInterview.time}ч`);
    
    setNewInterview({
      candidateName: '',
      candidatePhone: '',
      position: '',
      time: '',
      office: ''
    });
    setIsDialogOpen(false);
  };

  const getInterviewsForDay = (day: Date) => {
    return interviews.filter(interview => isSameDay(interview.date, day));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logo} alt="HRCO Logo" className="h-16 w-16 object-contain" />
              <h1 className="text-3xl font-bold text-foreground">Календар за интервюта</h1>
            </div>
            <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm">
              <Home className="h-4 w-4 mr-2" />
              Начало
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Card className="p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <Button onClick={handlePreviousMonth} variant="outline" size="sm">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-semibold">
              {format(currentDate, 'MMMM yyyy', { locale: bg })}
            </h2>
            <Button onClick={handleNextMonth} variant="outline" size="sm">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Week day headers */}
            {weekDays.map(day => (
              <div key={day} className="text-center font-semibold text-sm p-2 text-muted-foreground">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {days.map((day, idx) => {
              const dayInterviews = getInterviewsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(day)}
                  className={`min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors ${
                    isCurrentMonth ? 'bg-card hover:bg-accent' : 'bg-muted/50'
                  } ${isToday ? 'border-primary border-2' : 'border-border'}`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayInterviews.map(interview => (
                      <div
                        key={interview.id}
                        className="text-xs p-1 bg-primary/10 text-primary rounded truncate"
                        title={`${interview.time}ч - ${interview.candidateName}`}
                      >
                        {interview.time}ч - {interview.candidateName}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </main>

      {/* Add Interview Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Запиши интервю за {selectedDate && format(selectedDate, 'dd MMMM yyyy', { locale: bg })}
            </DialogTitle>
            <DialogDescription>
              Добавете информация за ново интервю с кандидат.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="candidateName">Име на кандидат</Label>
              <Input
                id="candidateName"
                value={newInterview.candidateName}
                onChange={(e) => setNewInterview({ ...newInterview, candidateName: e.target.value })}
                placeholder="Иван Иванов"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="candidatePhone">Телефон</Label>
              <Input
                id="candidatePhone"
                value={newInterview.candidatePhone}
                onChange={(e) => setNewInterview({ ...newInterview, candidatePhone: e.target.value })}
                placeholder="0888123456"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="position">Позиция</Label>
              <Input
                id="position"
                value={newInterview.position}
                onChange={(e) => setNewInterview({ ...newInterview, position: e.target.value })}
                placeholder="Агент"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="time">Час</Label>
              <Select value={newInterview.time} onValueChange={(value) => setNewInterview({ ...newInterview, time: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Изберете час" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => 9 + i).map(hour => (
                    <SelectItem key={hour} value={`${hour}:00`}>
                      {hour}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="office">Офис</Label>
              <Input
                id="office"
                value={newInterview.office}
                onChange={(e) => setNewInterview({ ...newInterview, office: e.target.value })}
                placeholder="София Витоша"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Отказ
            </Button>
            <Button onClick={handleSubmit}>
              <Plus className="h-4 w-4 mr-2" />
              Запиши
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-12">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">
            Разработено от Octa Investment Group
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Interviews;
