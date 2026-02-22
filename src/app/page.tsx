'use client';

import { useState, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { ImageUploader } from '@/components/ImageUploader';
import { PromptInput } from '@/components/PromptInput';
import { GenerationSettings } from '@/components/GenerationSettings';
import { GenerationProgress } from '@/components/GenerationProgress';
import { ComparisonView } from '@/components/ComparisonView';
import { GenerationHistory } from '@/components/GenerationHistory';
import { Favorites } from '@/components/Favorites';
import { PromoCodeInput } from '@/components/PromoCodeInput';
import { useGeneration } from '@/hooks/useGeneration';
import { useHistory } from '@/hooks/useHistory';
import { useFavorites } from '@/hooks/useFavorites';
import { VideoSettings, HistoryItem, DEFAULT_SETTINGS, HIDDEN_PROMPT_BASE, HIDDEN_PROMPT_LENGTH, MAX_PROMPT_LENGTH, detectCameraMotion } from '@/lib/types';
import { exportSettings, importSettings } from '@/lib/storage';
import {
  Sparkles,
  History as HistoryIcon,
  Star,
  Settings,
  Download,
  Upload,
  Video,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { SignInButton, SignUpButton, UserButton, SignedIn, SignedOut, useAuth } from '@clerk/nextjs';

export default function Home() {
  const { toast } = useToast();
  const { userId } = useAuth();
  const [sessionId, setSessionId] = useState<string>('');

  // Generate or get session ID
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let sid = localStorage.getItem('sessionId');
      if (!sid) {
        sid = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('sessionId', sid);
      }
      // Defer setState to avoid cascading renders
      const timer = setTimeout(() => setSessionId(sid), 0);
      return () => clearTimeout(timer);
    }
  }, []);
  
  // State
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [settings, setSettings] = useState<VideoSettings>(DEFAULT_SETTINGS);
  const [useSeed, setUseSeed] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');
  const [generatedVideo, setGeneratedVideo] = useState<{
    imageUrl: string;
    videoUrl: string;
    historyItem?: HistoryItem;
  } | null>(null);

  // Hooks
  const { task, isLoading, retryCount, generate, cancel, reset, retry } = useGeneration({
    onSuccess: (completedTask) => {
      if (completedTask.imageUrl && completedTask.videoUrl) {
        // Save to local history
        const historyItem = history.add({
          imageUrl: completedTask.imageUrl,
          videoUrl: completedTask.videoUrl,
          prompt: prompt.trim(),
          settings: completedTask.settings || DEFAULT_SETTINGS,
          thumbnail: completedTask.imageUrl,
        });
        
        setGeneratedVideo({
          imageUrl: completedTask.imageUrl,
          videoUrl: completedTask.videoUrl,
          historyItem,
        });

        toast({
          title: 'Video Generated!',
          description: 'Your video has been generated successfully.',
        });
      }
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: err.message,
      });
    },
  });

  const history = useHistory();
  const favorites = useFavorites();

  // Generate video
  const handleGenerate = useCallback(() => {
    if (!imageBase64) {
      toast({
        variant: 'destructive',
        title: 'No Image',
        description: 'Please upload an image first.',
      });
      return;
    }

    // Detect camera motion from user prompt
    const userPromptText = prompt.trim();
    const cameraMotion = detectCameraMotion(userPromptText);

    // Build combined prompt
    let effectivePrompt: string;
    
    if (userPromptText) {
      let emphasizedUserPrompt = userPromptText;
      
      if (/return|back|original/i.test(userPromptText)) {
        emphasizedUserPrompt += ` Camera MUST return to starting position.`;
      }
      
      if (/while|then|and then|after|before/i.test(userPromptText)) {
        emphasizedUserPrompt = `SEQUENCE: ${userPromptText} Execute ALL steps in order.`;
      }
      
      effectivePrompt = `${emphasizedUserPrompt}. ${HIDDEN_PROMPT_BASE}`;
      
      if (cameraMotion) {
        const userHasCameraInstruction = /camera|lower|raise|tilt|pan|zoom|return|angle/i.test(userPromptText);
        if (!userHasCameraInstruction) {
          effectivePrompt = `CAMERA: ${cameraMotion.instruction} ${effectivePrompt}`;
        }
      }
    } else {
      effectivePrompt = `Natural motion. ${HIDDEN_PROMPT_BASE}`;
      if (cameraMotion) {
        effectivePrompt = `CAMERA: ${cameraMotion.instruction} ${effectivePrompt}`;
      }
    }
    
    console.log('[Generate] User prompt:', userPromptText);
    console.log('[Generate] Final prompt length:', effectivePrompt.length);

    generate(imageBase64, effectivePrompt, settings, userPromptText, sessionId, userId);
  }, [imageBase64, prompt, settings, generate, toast, sessionId, userId]);

  // Load from history
  const handleHistorySelect = useCallback((item: HistoryItem) => {
    setImageBase64(item.imageUrl);
    setPrompt(item.prompt);
    setSettings(item.settings);
    setUseSeed(item.settings.seed !== undefined);
    setGeneratedVideo({
      imageUrl: item.imageUrl,
      videoUrl: item.videoUrl,
      historyItem: item,
    });
    setActiveTab('generate');
  }, []);

  // Toggle favorite
  const handleToggleFavorite = useCallback(() => {
    if (generatedVideo?.historyItem) {
      const updatedHistory = favorites.toggleFavorite(generatedVideo.historyItem.id);
      const updated = updatedHistory.find((h) => h.id === generatedVideo.historyItem?.id);
      if (updated) {
        setGeneratedVideo({
          ...generatedVideo,
          historyItem: updated,
        });
      }
    }
  }, [generatedVideo, favorites]);

  // Export settings
  const handleExport = useCallback(() => {
    const json = exportSettings();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video-gen-settings-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Settings Exported',
      description: 'Your settings have been downloaded as a JSON file.',
    });
  }, [toast]);

  // Import settings
  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const imported = importSettings(content);

        if (imported) {
          setPrompt(imported.prompt);
          setSettings(imported.settings);
          setUseSeed(imported.settings.seed !== undefined);

          toast({
            title: 'Settings Imported',
            description: 'Your settings have been loaded successfully.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Import Failed',
            description: 'Could not parse the settings file.',
          });
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [toast]
  );

  // Reset generation state
  const handleNewGeneration = useCallback(() => {
    reset();
    setGeneratedVideo(null);
  }, [reset]);

  // Handle useSeed change
  const handleUseSeedChange = useCallback((value: boolean) => {
    setUseSeed(value);
  }, []);

  // Calculate total prompt length for display
  const totalPromptLength = prompt.trim().length + (prompt.trim() ? 2 : 0) + HIDDEN_PROMPT_LENGTH;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="flex items-center gap-2 mr-4">
            <div className="p-1.5 rounded-lg bg-primary">
              <Video className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold">Image to Video</h1>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2">
            {/* Auth Buttons */}
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm">
                  <LogIn className="w-4 h-4 mr-1" />
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button variant="default" size="sm">
                  <UserPlus className="w-4 h-4 mr-1" />
                  Sign Up
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-1" />
                  Settings
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Settings
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <label className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    Import Settings
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="hidden"
                    />
                  </label>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
            <TabsTrigger value="generate" className="gap-1">
              <Sparkles className="w-4 h-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1">
              <HistoryIcon className="w-4 h-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="favorites" className="gap-1">
              <Star className="w-4 h-4" />
              Favorites
            </TabsTrigger>
          </TabsList>

          {/* Generate Tab */}
          <TabsContent value="generate" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Input */}
              <div className="space-y-6">
                {/* Image Upload */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Source Image</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ImageUploader
                      value={imageBase64}
                      onChange={setImageBase64}
                      disabled={isLoading}
                    />
                  </CardContent>
                </Card>

                {/* Prompt */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Animation Prompt</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PromptInput
                      value={prompt}
                      onChange={setPrompt}
                      disabled={isLoading}
                      totalLength={totalPromptLength}
                    />
                  </CardContent>
                </Card>

                {/* Settings */}
                <GenerationSettings
                  value={settings}
                  onChange={setSettings}
                  disabled={isLoading}
                  useSeed={useSeed}
                  onUseSeedChange={handleUseSeedChange}
                />

                {/* Promo Code / Usage Status */}
                <PromoCodeInput />

                {/* Generate Button */}
                {!generatedVideo && !isLoading && (
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleGenerate}
                    disabled={!imageBase64}
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Video
                  </Button>
                )}

                {/* Generation in progress */}
                {isLoading && (
                  <GenerationProgress
                    task={task}
                    retryCount={retryCount}
                    onRetry={retry}
                    onCancel={cancel}
                  />
                )}
              </div>

              {/* Right Column - Output */}
              <div className="space-y-6">
                {/* Generated Video */}
                {generatedVideo ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Result</CardTitle>
                        <Button variant="outline" size="sm" onClick={handleNewGeneration}>
                          New Generation
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ComparisonView
                        imageUrl={generatedVideo.imageUrl}
                        videoUrl={generatedVideo.videoUrl}
                        isFavorite={favorites.isFavorite(
                          generatedVideo.historyItem?.id || ''
                        )}
                        onToggleFavorite={handleToggleFavorite}
                        historyItem={generatedVideo.historyItem}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="p-4 rounded-full bg-muted mb-4">
                        <Video className="w-12 h-12 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">No Video Yet</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Upload an image, enter a prompt, and click generate to create your video.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold">{history.history.length}</div>
                    <div className="text-xs text-muted-foreground">Generations</div>
                  </Card>
                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold">{favorites.favorites.length}</div>
                    <div className="text-xs text-muted-foreground">Favorites</div>
                  </Card>
                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold">{settings.duration}s</div>
                    <div className="text-xs text-muted-foreground">Video Length</div>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <GenerationHistory
              history={history.history}
              onSelect={handleHistorySelect}
              onDelete={history.remove}
              onClearAll={history.clear}
              onToggleFavorite={favorites.toggleFavorite}
            />
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites">
            <Favorites
              favorites={favorites.favorites}
              onSelect={handleHistorySelect}
              onRemoveFavorite={favorites.removeFromFavorites}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-12">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Image to Video Generator - Powered by AI</p>
        </div>
      </footer>
    </div>
  );
}
