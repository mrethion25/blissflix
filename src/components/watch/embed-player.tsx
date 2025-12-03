'use client';

import React from 'react';
import Loading from '../ui/loading';
import { useRouter } from 'next/navigation';
import { MediaType, type IEpisode, type ISeason, type Show } from '@/types';
import MovieService from '@/services/MovieService';
import { type AxiosResponse } from 'axios';

interface EmbedPlayerProps {
  url: string;
  movieId?: string;
  mediaType?: MediaType;
}

export default function EmbedPlayer(props: EmbedPlayerProps) {
  const router = useRouter();
  const [seasons, setSeasons] = React.useState<ISeason[] | null>(null);
  const [selectedSeason, setSelectedSeason] = React.useState<number>(0);
  const [showEpisodes, setShowEpisodes] = React.useState(false);
  const [showSources, setShowSources] = React.useState(false);
  const [selectedSource, setSelectedSource] = React.useState<string>('VidSrc (API1)');

  const loadingRef = React.useRef<HTMLDivElement>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const sources = React.useMemo(
    () => [
      { name: 'VidSrc (API1)', url: props.url },
      { name: 'VidSrc (API2)', url: props.url?.replace('/v2/', '/v1/') },
      { name: 'VidRock', url: `https://vidrock.xyz/v/${props.movieId}` },
      { name: 'Vidzee', url: `https://vidzee.pro/v/${props.movieId}` },
    ],
    [props.url, props.movieId],
  );

  React.useEffect(() => {
    if (props.mediaType === MediaType.ANIME) return;
    if (iframeRef.current) iframeRef.current.src = props.url;

    const iframe = iframeRef.current;
    iframe?.addEventListener('load', handleIframeLoaded);
    return () => iframe?.removeEventListener('load', handleIframeLoaded);
  }, []);

  React.useEffect(() => {
    if (!props.movieId || props.mediaType !== MediaType.ANIME) return;
    void handleAnime(props.movieId);
  }, [props.movieId, props.mediaType]);

  const handleAnime = async (movieId: string) => {
    const id = Number(movieId.replace('t-', ''));
    const response: AxiosResponse<Show> = await MovieService.findTvSeries(id);
    const { data } = response;
    if (!data?.seasons?.length) return;

    const valid = data.seasons.filter((s: ISeason) => s.season_number);
    const requests = valid.map((s: ISeason) =>
      MovieService.getSeasons(Number(id), s.season_number),
    );

    const results = await Promise.all(requests);
    setSeasons(results.map((r: AxiosResponse<ISeason>) => r.data));
    setSelectedSeason(0);

    handleSetIframeUrl(`https://vidsrc.cc/v2/embed/anime/tmdb${id}/1/sub?autoPlay=false`);
  };

  const handleChangeEpisode = (episode: IEpisode) => {
    handleSetIframeUrl(
      `https://vidsrc.cc/v2/embed/anime/tmdb${episode.show_id}/${episode.episode_number}/sub`,
    );
  };

  const handleSetIframeUrl = (url: string) => {
    if (!iframeRef.current) return;
    iframeRef.current.src = url;
    iframeRef.current.addEventListener('load', handleIframeLoaded);
    if (loadingRef.current) loadingRef.current.style.display = 'flex';
  };

  const handleIframeLoaded = () => {
    if (!iframeRef.current) return;
    iframeRef.current.style.opacity = '1';
    iframeRef.current.removeEventListener('load', handleIframeLoaded);
    if (loadingRef.current) loadingRef.current.style.display = 'none';
  };

  return (
    <div className="absolute inset-0 h-full w-full bg-black">
      {/* Top Buttons Row */}
      <div className="absolute top-4 left-0 right-0 z-30 flex justify-between px-4">
        <svg
          className="h-10 w-10 cursor-pointer hover:scale-125 transition"
          stroke="#fff"
          fill="#fff"
          viewBox="0 0 16 16"
          onClick={() => router.back()}>
          <path d="M15 8a.5.5 0 0 0-.5-.5H2.7l3.1-3.1a.5.5 0 1 0-.7-.7l-4 4a.5.5 0 0 0 0 .7l4 4a.5.5 0 0 0 .7-.7L2.7 8.5H14.5A.5.5 0 0 0 15 8z" />
        </svg>

        <div className="flex gap-3">
          <button
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20"
            onClick={() => {
              setShowEpisodes(!showEpisodes);
              setShowSources(false);
            }}>
            Episodes
          </button>
          <button
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20"
            onClick={() => {
              setShowSources(!showSources);
              setShowEpisodes(false);
            }}>
            Sources
          </button>
        </div>
      </div>

      {/* Episode Panel */}
      {showEpisodes && seasons && (
        <div className="absolute top-20 inset-x-0 z-20 max-h-[75%] overflow-y-auto rounded-xl bg-black/80 p-4 backdrop-blur-md">
          <div className="mb-4">
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
              className="w-full rounded-lg bg-white/10 p-2 text-white">
              {seasons.map((season, idx) => (
                <option value={idx} key={season.id}>
                  Season {season.season_number}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {seasons[selectedSeason]?.episodes?.map((ep) => (
              <div
                key={ep.id}
                className="flex overflow-hidden rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer"
                onClick={() => handleChangeEpisode(ep)}>
                <img
                  src={`https://image.tmdb.org/t/p/w500${ep.still_path}`}
                  className="h-32 w-48 object-cover"
                />
                <div className="flex flex-col justify-between p-3">
                  <div>
                    <h3 className="font-bold text-white">{`EP ${ep.episode_number}: ${ep.name}`}</h3>
                    <p className="text-sm text-gray-400 line-clamp-2">{ep.overview}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-300">
                    <span>⭐ {ep.vote_average.toFixed(1)}</span>
                    <span>⏱ {ep.runtime}m</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Source Cards */}
      {showSources && (
        <div className="absolute top-20 inset-x-0 z-20 grid grid-cols-2 gap-4 p-4 rounded-xl bg-black/80 backdrop-blur-md">
          {sources.map((s) => (
            <button
              key={s.name}
              onClick={() => {
                setSelectedSource(s.name);
                handleSetIframeUrl(s.url || props.url);
              }}
              className={`rounded-xl p-4 text-center font-bold ${
                selectedSource === s.name
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      <div
        ref={loadingRef}
        className="absolute inset-0 z-[1] hidden items-center justify-center">
        <Loading />
      </div>

      {/* Player */}
      <iframe
        width="100%"
        height="100%"
        allowFullScreen
        ref={iframeRef}
        style={{ opacity: 0 }}
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
    }
